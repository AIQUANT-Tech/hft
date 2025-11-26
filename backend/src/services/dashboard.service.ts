// src/services/dashboard.service.ts

import Portfolio from "../models/portfolio.model.js";
import Strategy from "../models/strategy.model.js";
import ActivityLog from "../models/activityLog.model.js";
import PortfolioHistory from "../models/portfolioHistory.model.js";
import { Op } from "sequelize";
import axios from "axios";
import { getAdaPriceCached } from "../utils/helper.js";
import { CardanoService } from "./cardano.service.js";

export class DashboardService {
  // Get complete dashboard data
  async getDashboardData(walletAddress: string) {
    try {
      const [portfolio, holdings, strategies, activities, history] =
        await Promise.all([
          this.getPortfolioStats(walletAddress),
          this.getHoldings(walletAddress),
          this.getActiveStrategies(walletAddress),
          this.getRecentActivities(walletAddress),
          this.getPortfolioHistory(walletAddress),
        ]);

      return {
        portfolio,
        holdings,
        strategies,
        activities,
        history,
      };
    } catch (error) {
      throw new Error(`Failed to fetch dashboard data: ${error}`);
    }
  }

  // Get portfolio stats
  async getPortfolioStats(walletAddress: string) {
    let portfolio = await Portfolio.findOne({ where: { walletAddress } });
    // fetch value usd from coin geko and return in response
    if (!portfolio) {
      // Create default portfolio if doesn't exist
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

    // Extract ADA → USD price
    const adaToUsdPrice = await getAdaPriceCached();
    const totalValueAda = parseFloat(portfolio.totalValueAda);
    const totalValueUsd = totalValueAda * adaToUsdPrice;
    // You may add a temporary property to hold USD value for frontend
    (portfolio.dataValues as any).totalValueUsd = totalValueUsd.toFixed(2);
    return portfolio;
  }

  // Get holdings (fetch from blockchain or cache)
  // async getHoldings(ownerAddress: string) {
  //   // Find all wallets for the owner
  //   const userWallets: string[] = await CardanoService.getWalletsByOwner(
  //     ownerAddress
  //   );

  //   // Fetch holdings for each wallet
  //   const holdings = await Promise.all(
  //     userWallets.map(async (walletAddress) => {
  //       const holdings = await CardanoService.getWalletHoldings(walletAddress);
  //       return holdings;
  //     })
  //   );

  //   return holdings;
  // }
  // wherever you implemented getHoldings
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

    // Aggregate by unique key (use policyId+assetName or unit)
    const map = new Map<
      string,
      {
        tokenSymbol: string;
        tokenName: string;
        policyId: string;
        assetName: string;
        amount: bigint; // keep bigint for safe sum, convert later
        priceChange24h: string;
        wallets: string[]; // list of wallet addresses that hold it
      }
    >();

    for (const item of flat) {
      // determine a stable key. If assetName is hex use policyId+assetName, else unit
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

    // Convert map to array and stringify amounts
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
    const strategies = await Strategy.findAll({
      where: {
        walletAddress,
        isActive: true,
      },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    return strategies;
  }

  // Get recent activities
  async getRecentActivities(walletAddress: string, limit: number = 10) {
    const activities = await ActivityLog.findAll({
      where: { walletAddress },
      order: [["createdAt", "DESC"]],
      limit,
    });

    return activities;
  }

  // Get portfolio history for charts
  async getPortfolioHistory(walletAddress: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await PortfolioHistory.findAll({
      where: {
        walletAddress,
        date: {
          [Op.gte]: startDate,
        },
      },
      order: [["date", "ASC"]],
    });

    return history;
  }

  // Update portfolio stats
  async updatePortfolioStats(walletAddress: string) {
    try {
      // Get all strategies
      const strategies = await Strategy.findAll({
        where: { walletAddress },
      });

      // Calculate totals
      let totalInvested = 0;
      let totalCurrent = 0;
      let activeCount = 0;

      strategies.forEach((strategy) => {
        totalInvested += parseFloat(strategy.investedAmount);
        totalCurrent += parseFloat(strategy.currentValue);
        if (strategy.isActive) activeCount++;
      });

      const totalGainLoss = totalCurrent - totalInvested;
      const totalGainLossPercent =
        totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

      // Get today's profit (compare with yesterday's snapshot)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayHistory = await PortfolioHistory.findOne({
        where: {
          walletAddress,
          date: yesterday.toISOString().split("T")[0],
        },
      });

      const yesterdayValue = yesterdayHistory
        ? parseFloat(yesterdayHistory.totalValueAda)
        : totalInvested;
      const todayProfit = totalCurrent - yesterdayValue;
      const todayProfitPercent =
        yesterdayValue > 0 ? (todayProfit / yesterdayValue) * 100 : 0;

      // Update or create portfolio
      const [portfolio] = await Portfolio.upsert({
        walletAddress,
        totalValueAda: totalCurrent.toString(),
        totalGainLoss: totalGainLoss.toString(),
        totalGainLossPercent: totalGainLossPercent.toFixed(2),
        todayProfit: todayProfit.toString(),
        todayProfitPercent: todayProfitPercent.toFixed(2),
        activeStrategiesCount: activeCount,
        lastUpdated: new Date(),
      });

      // Extract ADA → USD price
      const adaToUsdPrice = await getAdaPriceCached();
      const totalValueAda = parseFloat(portfolio.totalValueAda);
      const totalValueUsd = totalValueAda * adaToUsdPrice;

      // You may add a temporary property to hold USD value for frontend
      (portfolio.dataValues as any).totalValueUsd = totalValueUsd.toFixed(2);

      return portfolio;
    } catch (error) {
      throw new Error(`Failed to update portfolio stats: ${error}`);
    }
  }

  // Log activity
  async logActivity(data: {
    walletAddress: string;
    strategyId?: string;
    strategyName?: string;
    action: "BUY" | "SELL" | "CREATE" | "PAUSE" | "RESUME" | "DELETE";
    status: "pending" | "completed" | "failed";
    tradingPair?: string;
    amount?: string;
    price?: string;
    profitLoss?: string;
    txHash?: string;
    details?: string;
  }) {
    const activity = await ActivityLog.create(data);
    return activity;
  }

  // Snapshot portfolio for history (run daily)
  async snapshotPortfolio(walletAddress: string) {
    const portfolio = await this.getPortfolioStats(walletAddress);

    const today = new Date().toISOString().split("T")[0];

    const [history] = await PortfolioHistory.upsert({
      walletAddress,
      date: new Date(today),
      totalValueAda: portfolio.totalValueAda,
      profitLoss: portfolio.totalGainLoss,
    });

    // Extract ADA → USD price
    const adaToUsdPrice = await getAdaPriceCached();
    const totalValueAda = parseFloat(portfolio.totalValueAda);
    const totalValueUsd = totalValueAda * adaToUsdPrice;

    // You may add a temporary property to hold USD value for frontend
    (history.dataValues as any).totalValueUsd = totalValueUsd.toFixed(2);

    return history;
  }

  // Get strategy breakdown for pie chart
  async getStrategyBreakdown(walletAddress: string) {
    const strategies = await Strategy.findAll({
      where: { walletAddress, isActive: true },
    });

    const breakdown = strategies.reduce((acc: any, strategy) => {
      const type = strategy.type;
      if (!acc[type]) {
        acc[type] = {
          name: type,
          value: 0,
          count: 0,
        };
      }
      acc[type].value += parseFloat(strategy.investedAmount);
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
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(2) : 0,
      count: item.count,
    }));
  }
}

export const dashboardService = new DashboardService();
