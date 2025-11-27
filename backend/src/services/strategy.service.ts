// src/services/strategy.service.ts

import Strategy from "../models/strategy.model.js";
import { logger } from "./logger.service.js";

export class StrategyService {
  // Create or update strategy in DB when started
  async upsertStrategy(strategyData: {
    id: string;
    walletAddress: string;
    name: string;
    type: "grid" | "dca" | "price-target" | "stop-loss-take-profit";
    tradingPair: string;
    baseToken: string;
    quoteToken: string;
    investedAmount?: string;
    config: any;
  }) {
    try {
      const [strategy, created] = await Strategy.upsert({
        id: strategyData.id,
        walletAddress: strategyData.walletAddress,
        name: strategyData.name,
        type: strategyData.type,
        tradingPair: strategyData.tradingPair,
        baseToken: strategyData.baseToken,
        quoteToken: strategyData.quoteToken,
        investedAmount: strategyData.investedAmount || "0",
        currentValue: strategyData.investedAmount || "0",
        profitLoss: "0",
        profitLossPercent: "0",
        isActive: true,
        status: "active",
        config: JSON.stringify(strategyData.config),
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
      });

      logger.success(
        `Strategy ${created ? "created" : "updated"} in database`,
        strategyData.name,
        "strategy"
      );

      return strategy;
    } catch (error) {
      logger.error(
        `Failed to upsert strategy: ${(error as Error).message}`,
        strategyData.name,
        "strategy"
      );
      throw error;
    }
  }

  // Update strategy status
  async updateStrategyStatus(
    id: string,
    status: "active" | "paused" | "completed" | "failed"
  ) {
    try {
      await Strategy.update(
        { status, isActive: status === "active" },
        { where: { id } }
      );
      logger.info(`Strategy status updated to ${status}`, id, "strategy");
    } catch (error) {
      logger.error(
        `Failed to update strategy status: ${(error as Error).message}`,
        id,
        "strategy"
      );
    }
  }

  // Update strategy metrics after trade
  async updateStrategyMetrics(
    id: string,
    metrics: {
      currentValue?: string;
      profitLoss?: string;
      profitLossPercent?: string;
      totalTrades?: number;
      successfulTrades?: number;
      failedTrades?: number;
    }
  ) {
    try {
      await Strategy.update(metrics, { where: { id } });
      logger.info(`Strategy metrics updated`, id, "strategy");
    } catch (error) {
      logger.error(
        `Failed to update strategy metrics: ${(error as Error).message}`,
        id,
        "strategy"
      );
    }
  }

  // Get strategy by ID
  async getStrategyById(id: string) {
    return await Strategy.findByPk(id);
  }

  // Get all strategies for wallet
  async getStrategiesByWallet(walletAddress: string) {
    return await Strategy.findAll({
      where: { walletAddress },
      order: [["createdAt", "DESC"]],
    });
  }

  // Delete strategy
  async deleteStrategy(id: string) {
    try {
      await Strategy.destroy({ where: { id } });
      logger.warning(`Strategy deleted from database`, id, "strategy");
    } catch (error) {
      logger.error(
        `Failed to delete strategy: ${(error as Error).message}`,
        id,
        "strategy"
      );
    }
  }
}

export const strategyService = new StrategyService();
