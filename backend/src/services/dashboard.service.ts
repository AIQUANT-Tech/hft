// src/services/dashboard.service.ts
import Portfolio from "../models/portfolio.model.js";
import Strategy from "../models/strategy.model.js";
import PortfolioHistory from "../models/portfolioHistory.model.js";
import { Op } from "sequelize";
import axios from "axios";
import { getAdaPriceCached } from "../utils/helper.js";
import { CardanoService } from "./cardano.service.js";
import { strategyManager } from "./strategyManager.service.js";

export class DashboardService {
  // Get complete dashboard data
  async getDashboardData(walletAddress: string) {
    try {
      // Ensure portfolio stats are fresh for user's wallets
      const userWallets = await CardanoService.getWalletsByOwner(walletAddress);
      await Promise.all(
        userWallets.map((wallet) => this.updatePortfolioStats(wallet))
      );

      const [portfolio, holdings, strategies, history] = await Promise.all([
        this.getPortfolioStats(walletAddress),
        this.getHoldings(walletAddress),
        this.getAllStrategies(walletAddress),
        this.getPortfolioHistory(walletAddress),
      ]);

      return { portfolio, holdings, strategies, history };
    } catch (error) {
      throw new Error(`Failed to fetch dashboard data: ${error}`);
    }
  }

  // Get portfolio stats
  async getPortfolioStats(walletAddress: string) {
    // Attempt to keep portfolio current
    // NOTE: leaving this call is optional; if updatePortfolioStats is expensive you can remove.
    await this.updatePortfolioStats(walletAddress);

    let portfolio = await Portfolio.findOne({ where: { walletAddress } });

    if (!portfolio) {
      portfolio = await Portfolio.create({
        walletAddress,
        totalValueAda: "0",
        totalGainLoss: "0",
        totalGainLossPercent: "0",
        todayProfit: "0",
        todayProfitPercent: "0",
        activeStrategiesCount: 0,
        lastUpdated: new Date(),
      });
    }

    const adaToUsdPrice = await getAdaPriceCached();
    const totalValueAda = Number(portfolio.totalValueAda || "0");
    const totalValueUsd = totalValueAda * adaToUsdPrice;

    (portfolio.dataValues as any).totalValueUsd = totalValueUsd.toFixed(2);
    return portfolio;
  }

  // Get holdings
  async getHoldings(ownerAddress: string) {
    const userWallets: string[] = await CardanoService.getWalletsByOwner(
      ownerAddress
    );

    const holdingsArrays = await Promise.all(
      userWallets.map(async (walletAddress) => {
        const h = await CardanoService.getWalletHoldings(walletAddress);
        return h || [];
      })
    );

    const flat = holdingsArrays.flat();

    const map = new Map<
      string,
      {
        tokenSymbol: string;
        tokenName: string;
        policyId: string;
        assetName: string;
        amount: bigint;
        priceChange24h: string;
        wallets: string[];
      }
    >();

    for (const item of flat) {
      const key =
        item.policyId && item.assetName
          ? `${item.policyId}:${item.assetName}`
          : item.tokenSymbol;

      const prev = map.get(key);
      const amountBig = BigInt(item.amount || "0");

      if (!prev) {
        map.set(key, {
          tokenSymbol: item.tokenSymbol,
          tokenName: item.tokenName,
          policyId: item.policyId,
          assetName: item.assetName,
          amount: amountBig,
          priceChange24h: item.priceChange24h || "0",
          wallets: [item.walletAddress],
        });
      } else {
        prev.amount += amountBig;
        if (!prev.wallets.includes(item.walletAddress))
          prev.wallets.push(item.walletAddress);
        map.set(key, prev);
      }
    }

    const aggregated = Array.from(map.values()).map((v) => ({
      tokenSymbol: v.tokenSymbol,
      tokenName: v.tokenName,
      policyId: v.policyId,
      assetName: v.assetName,
      amount: v.amount.toString(),
      priceChange24h: v.priceChange24h,
      wallets: v.wallets,
    }));

    return aggregated;
  }

  // Get active strategies
  async getActiveStrategies(walletAddress: string) {
    const strategies = strategyManager.getAllActiveStrategies(walletAddress);
    return strategies;
  }

  // Get all strategies (flattened)
  async getAllStrategies(ownerAddress: string) {
    const userWallets: string[] = await CardanoService.getWalletsByOwner(
      ownerAddress
    );

    const strategiesArrays = await Promise.all(
      userWallets.map(async (walletAddress) => {
        return await Strategy.findAll({
          where: { walletAddress },
        });
      })
    );

    const strategies = strategiesArrays.flat();
    console.log("strategies", strategies);

    return strategies;
  }

  // Get portfolio history for charts
  async getPortfolioHistory(walletAddress: string, days: number = 30) {
    // compute start date (days ago) as YYYY-MM-DD then make a UTC midnight Date object
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startDateStr = start.toISOString().split("T")[0]; // YYYY-MM-DD
    const startDateObj = new Date(startDateStr + "T00:00:00.000Z"); // UTC midnight

    // fetch only fields we need
    const history = await PortfolioHistory.findAll({
      where: {
        walletAddress,
        date: {
          [Op.gte]: startDateObj, // safe date comparison for DATE column
        },
      },
      attributes: ["date", "totalValueAda", "profitLoss"],
      order: [["date", "ASC"]],
    });

    // price once
    const adaToUsdPrice = await getAdaPriceCached();

    // normalize output
    const mapped = history.map((h: any) => {
      // Normalize date -> YYYY-MM-DD (works whether h.date is Date or string)
      const dateObj =
        h.date instanceof Date ? h.date : new Date(String(h.date));
      const dateStr = dateObj.toISOString().split("T")[0];

      const totalAda = Number(h.totalValueAda ?? 0);
      const profitLoss = Number(h.profitLoss ?? 0);

      return {
        date: dateStr,
        totalValueAda: totalAda.toFixed(6),
        totalValueUsd: (totalAda * adaToUsdPrice).toFixed(2),
        profitLoss: profitLoss.toFixed(6),
      };
    });

    return mapped;
  }

  // Update portfolio stats
  async updatePortfolioStats(walletAddress: string) {
    try {
      const strategies = await Strategy.findAll({
        where: { walletAddress },
      });

      console.log("strategies: ", strategies);

      let totalInvested = 0;
      let totalCurrent = 0;
      let activeCount = 0;

      strategies.forEach((strategy) => {
        console.log("Strategy data:", strategy.dataValues);

        const invested = Number(strategy.dataValues.investedAmount) || 0;
        const current = Number(strategy.dataValues.currentValue) || 0;

        totalInvested += invested;
        totalCurrent += current;
        if (strategy.dataValues.isActive) activeCount++;
      });

      console.log("Totals:", { totalInvested, totalCurrent, activeCount });

      const totalGainLoss = totalCurrent - totalInvested;
      const totalGainLossPercent =
        totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

      // Yesterday as DATEONLY string
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDateStr = yesterday.toISOString().split("T")[0];

      const yesterdayHistory = await PortfolioHistory.findOne({
        where: {
          walletAddress,
          date: yesterdayDateStr,
        },
      });

      const yesterdayValue = yesterdayHistory
        ? Number(yesterdayHistory.totalValueAda) || totalInvested
        : totalInvested;

      const todayProfit = totalCurrent - yesterdayValue;
      const todayProfitPercent =
        yesterdayValue > 0 ? (todayProfit / yesterdayValue) * 100 : 0;

      // Upsert portfolio row
      const [portfolio] = await Portfolio.upsert({
        walletAddress,
        totalValueAda: totalCurrent.toFixed(6),
        totalGainLoss: totalGainLoss.toFixed(6),
        totalGainLossPercent: totalGainLossPercent.toFixed(2),
        todayProfit: todayProfit.toFixed(6),
        todayProfitPercent: todayProfitPercent.toFixed(2),
        activeStrategiesCount: activeCount,
        lastUpdated: new Date(),
      });

      // Upsert today's history as DATEONLY (YYYY-MM-DD)
      const todayStr = new Date().toISOString().split("T")[0];
      await PortfolioHistory.upsert({
        walletAddress,
        date: new Date(todayStr),
        totalValueAda: totalCurrent.toFixed(6),
        profitLoss: totalGainLoss.toFixed(6),
      });

      console.log("✅ PortfolioHistory snapshot created:", {
        walletAddress,
        date: todayStr,
        totalValueAda: totalCurrent.toFixed(6),
      });

      // Compute USD temporary prop
      const adaToUsdPrice = await getAdaPriceCached();
      const totalValueAda = Number(portfolio.totalValueAda);
      const totalValueUsd = totalValueAda * adaToUsdPrice;
      (portfolio.dataValues as any).totalValueUsd = totalValueUsd.toFixed(2);

      return portfolio;
    } catch (error) {
      throw new Error(`Failed to update portfolio stats: ${error}`);
    }
  }

  // Snapshot portfolio for history (run daily)
  async snapshotPortfolio(walletAddress: string) {
    const portfolio = await this.getPortfolioStats(walletAddress);

    const todayStr = new Date().toISOString().split("T")[0];

    const [history] = await PortfolioHistory.upsert({
      walletAddress,
      date: new Date(todayStr),
      totalValueAda: portfolio.totalValueAda,
      profitLoss: portfolio.totalGainLoss,
    });

    const adaToUsdPrice = await getAdaPriceCached();
    const totalValueAda = Number(portfolio.totalValueAda);
    const totalValueUsd = totalValueAda * adaToUsdPrice;

    (history.dataValues as any).totalValueUsd = totalValueUsd.toFixed(2);

    return history;
  }

  // Get strategy breakdown for pie chart
  async getStrategyBreakdown(walletAddress: string) {
    const strategies = await Strategy.findAll({
      where: { walletAddress, isActive: true },
    });

    const breakdown = strategies.reduce((acc: any, strategy) => {
      const type = strategy.dataValues.type;
      const invested = Number(strategy.dataValues.investedAmount) || 0;

      if (!acc[type]) {
        acc[type] = { name: type, value: 0, count: 0 };
      }
      acc[type].value += invested;
      acc[type].count++;
      return acc;
    }, {});

    const total = Object.values(breakdown).reduce(
      (sum: number, item: any) => sum + item.value,
      0
    );

    return Object.values(breakdown).map((item: any) => ({
      name: item.name,
      value: item.value,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(2) : "0.00",
      count: item.count,
    }));
  }
}

export const dashboardService = new DashboardService();
