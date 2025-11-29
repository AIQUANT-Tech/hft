// src/strategies/PriceTargetStrategy.ts

import { BaseStrategy, StrategyConfig } from "./BaseStrategy.js";
import { TradeOrder } from "../models/tradeOrder.model.js";
import { PriceUtil } from "../utils/price.util.js"; // ✅ Import

export interface PriceTargetConfig extends StrategyConfig {
  targetPrice: number;
  orderAmount: number;
  side: "BUY" | "SELL";
  triggerType: "ABOVE" | "BELOW";
  poolId: string;
  executeOnce: boolean;
}

export class PriceTargetStrategy extends BaseStrategy {
  private strategyConfig: PriceTargetConfig;
  private orderCreated = false;
  private orderId?: string;
  private currentPrice?: number;
  private lastPriceCheck?: Date;

  constructor(config: PriceTargetConfig) {
    super(config);
    this.strategyConfig = config;
  }

  validate(): boolean {
    if (this.strategyConfig.targetPrice <= 0) {
      this.log("❌ Invalid target price");
      return false;
    }

    if (this.strategyConfig.orderAmount <= 0) {
      this.log("❌ Invalid order amount");
      return false;
    }

    if (!["BUY", "SELL"].includes(this.strategyConfig.side)) {
      this.log("❌ Invalid side (must be BUY or SELL)");
      return false;
    }

    return true;
  }

  async execute(): Promise<void> {
    try {
      if (!this.config.isActive) {
        return;
      }

      await this.updateCurrentPrice();

      // Check if order exists and is completed
      if (this.orderId) {
        const order = await TradeOrder.findByPk(this.orderId);

        if (order) {
          if (order.status === "completed") {
            this.log(
              `✅ Order ${this.orderId} completed at ${order.executedPrice}`
            );

            if (this.strategyConfig.executeOnce) {
              this.config.isActive = false;
              this.log("🛑 Strategy stopped (executeOnce mode)");
            } else {
              this.orderId = undefined;
              this.orderCreated = false;
            }
            return;
          }

          if (order.status === "pending") {
            return;
          }

          if (order.status === "failed") {
            this.log(`❌ Order ${this.orderId} failed: ${order.errorMessage}`);

            this.orderId = undefined;
            this.orderCreated = false;

            if (this.strategyConfig.executeOnce) {
              this.config.isActive = false;
              this.log("🛑 Strategy stopped after failure (executeOnce mode)");
              return;
            }
          }
        }
      }

      // Only create new order if none exists
      if (!this.orderCreated) {
        await this.createNewOrder();
      }
    } catch (error) {
      this.log(`❌ Error executing strategy: ${(error as Error).message}`);
    }
  }

  // ✅ UPDATED: Use accurate swap-based pricing
  private async updateCurrentPrice(): Promise<void> {
    try {
      const price = await PriceUtil.calculateTokenPrice(
        this.strategyConfig.poolId,
        this.config.baseToken
      );

      if (price === null) {
        this.log("⚠️ Unable to fetch price");
        return;
      }

      this.currentPrice = price;
      this.lastPriceCheck = new Date();

      this.log(
        `📊 Current price: ${this.currentPrice} ${this.config.quoteToken}`
      );
    } catch (error) {
      this.log(`❌ Error fetching price: ${(error as Error).message}`);
    }
  }

  private async createNewOrder() {
    const triggerAbove = this.strategyConfig.triggerType === "ABOVE";
    const isBuy = this.strategyConfig.side === "BUY";

    this.log(
      `📝 Creating ${this.strategyConfig.side} order: ${this.strategyConfig.orderAmount} ${this.config.baseToken} at ${this.strategyConfig.targetPrice} ${this.config.quoteToken}`
    );

    const order = await this.createOrder({
      targetPrice: this.strategyConfig.targetPrice,
      triggerAbove,
      isBuy,
      amount: this.strategyConfig.orderAmount,
    });

    this.orderId = order.id;
    this.orderCreated = true;
    this.lastExecutionTime = new Date();

    this.log(`✅ Order created: ${order.id}`);
  }

  getStatus(): object {
    let priceDiff: number | undefined;
    let priceDiffPct: number | undefined;
    let conditionMet = false;

    if (this.currentPrice && this.strategyConfig.targetPrice) {
      priceDiff = this.currentPrice - this.strategyConfig.targetPrice;
      priceDiffPct = (priceDiff / this.strategyConfig.targetPrice) * 100;

      conditionMet =
        this.strategyConfig.triggerType === "ABOVE"
          ? this.currentPrice > this.strategyConfig.targetPrice
          : this.currentPrice < this.strategyConfig.targetPrice;
    }

    return {
      strategy: "PriceTarget",
      type: "PriceTarget",
      name: this.config.name,
      tradingPair: this.config.tradingPair,
      currentPrice: this.currentPrice || 0,
      targetPrice: this.strategyConfig.targetPrice,
      priceDifference: priceDiff || 0,
      priceDifferencePercent: priceDiffPct || 0,
      conditionMet: conditionMet,
      triggerType: this.strategyConfig.triggerType,
      orderAmount: this.strategyConfig.orderAmount,
      side: this.strategyConfig.side,
      isActive: this.config.isActive,
      orderCreated: this.orderCreated,
      lastPriceCheck: this.lastPriceCheck?.toISOString(),
    };
  }
}
