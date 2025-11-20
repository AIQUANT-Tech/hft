// src/strategies/ACAStrategy.ts

import { BaseStrategy, StrategyConfig } from "./BaseStrategy.js";
import { tradingBotService } from "../services/tradingBot.service.js";
import { logger } from "../services/logger.service.js";
import { PriceUtil } from "../utils/price.util.js"; // ✅ Import

export interface ACAConfig extends StrategyConfig {
  investmentAmount: number; // ADA per interval
  intervalMinutes: number; // Time between buys
  totalRuns?: number; // Optional: limit executions
  executeOnce: boolean; // Single buy mode
  runsExecuted: number; // Track completed buys
  lastBuyTime?: Date; // Track last execution
  poolId: string;
}

export class ACAStrategy extends BaseStrategy {
  config: ACAConfig;

  constructor(config: ACAConfig) {
    super(config);
    this.config = config;
  }

  validate(): boolean {
    return (
      !!this.config.walletAddress &&
      !!this.config.baseToken &&
      !!this.config.poolId &&
      this.config.investmentAmount > 0 &&
      this.config.intervalMinutes > 0
    );
  }

  async execute(): Promise<void> {
    if (!this.config.isActive) {
      return;
    }

    try {
      // Check if enough time has passed since last buy
      if (this.config.lastBuyTime) {
        const timeSinceLastBuy =
          Date.now() - new Date(this.config.lastBuyTime).getTime();
        const intervalMs = this.config.intervalMinutes * 60 * 1000;

        if (timeSinceLastBuy < intervalMs) {
          const remainingMinutes = Math.ceil(
            (intervalMs - timeSinceLastBuy) / 60000
          );
          logger.info(
            `Next buy in ${remainingMinutes} minutes`,
            this.config.name,
            "strategy"
          );
          return;
        }
      }

      // Check if reached total runs limit
      if (
        this.config.totalRuns &&
        this.config.runsExecuted >= this.config.totalRuns
      ) {
        logger.warning(
          `Reached maximum runs (${this.config.totalRuns}/${this.config.totalRuns})`,
          this.config.name,
          "strategy"
        );
        this.config.isActive = false;
        return;
      }

      // ✅ Get current token price using accurate method
      const currentPrice = await this.getCurrentPrice();

      if (!currentPrice) {
        logger.warning(
          `No price available for ${this.config.tradingPair}`,
          this.config.name,
          "strategy"
        );
        return;
      }

      logger.info(
        `Current ${
          this.config.tradingPair.split("-")[0]
        } price: ${currentPrice} ADA`,
        this.config.name,
        "strategy"
      );

      // Calculate token amount to buy with investment amount
      const tokenAmount = this.config.investmentAmount / currentPrice;

      logger.info(
        `Executing ACA buy: ${
          this.config.investmentAmount
        } ADA → ~${tokenAmount} ${this.config.tradingPair.split("-")[0]}`,
        this.config.name,
        "strategy"
      );

      // Create market buy order with poolId
      const order = await tradingBotService.createOrder({
        walletAddress: this.config.walletAddress,
        tradingPair: this.config.tradingPair,
        baseToken: this.config.baseToken,
        quoteToken: this.config.quoteToken,
        targetPrice: currentPrice * 1.01, // 1% slippage
        triggerAbove: false,
        isBuy: true,
        amount: tokenAmount,
        poolId: this.config.poolId,
      });

      // Update execution tracking
      this.config.runsExecuted++;
      this.config.lastBuyTime = new Date();

      logger.success(
        `ACA buy order created: ${order.id} (Run ${this.config.runsExecuted}${
          this.config.totalRuns ? `/${this.config.totalRuns}` : ""
        })`,
        this.config.name,
        "strategy"
      );

      // Stop if executeOnce is enabled
      if (this.config.executeOnce) {
        this.config.isActive = false;
        logger.warning(
          `Strategy stopped (executeOnce mode)`,
          this.config.name,
          "strategy"
        );
      }

      // Stop if reached total runs
      if (
        this.config.totalRuns &&
        this.config.runsExecuted >= this.config.totalRuns
      ) {
        this.config.isActive = false;
        logger.warning(
          `Strategy completed all ${this.config.totalRuns} runs`,
          this.config.name,
          "strategy"
        );
      }
    } catch (error) {
      logger.error(
        `ACA execution error: ${(error as Error).message}`,
        this.config.name,
        "strategy"
      );
    }
  }

  getStatus(): object {
    const nextBuyTime = this.config.lastBuyTime
      ? new Date(
          new Date(this.config.lastBuyTime).getTime() +
            this.config.intervalMinutes * 60 * 1000
        )
      : new Date();

    const timeUntilNextBuy = this.config.lastBuyTime
      ? Math.max(0, Math.ceil((nextBuyTime.getTime() - Date.now()) / 60000))
      : 0;

    return {
      name: this.config.name,
      type: "ACA",
      tradingPair: this.config.tradingPair,
      investmentAmount: this.config.investmentAmount,
      intervalMinutes: this.config.intervalMinutes,
      isActive: this.config.isActive,
      executeOnce: this.config.executeOnce,
      runsExecuted: this.config.runsExecuted,
      totalRuns: this.config.totalRuns || "Unlimited",
      lastBuyTime: this.config.lastBuyTime?.toISOString() || "Never",
      nextBuyTime: nextBuyTime.toISOString(),
      timeUntilNextBuy: `${timeUntilNextBuy} minutes`,
      progress: this.config.totalRuns
        ? `${this.config.runsExecuted}/${this.config.totalRuns}`
        : `${this.config.runsExecuted} buys`,
    };
  }

  // ✅ UPDATED: Use accurate swap-based pricing
  private async getCurrentPrice(): Promise<number | null> {
    return await PriceUtil.calculateTokenPrice(
      this.config.poolId,
      this.config.baseToken
    );
  }
}
