// src/strategies/DCAStrategy.ts

import { BaseStrategy, StrategyConfig } from "./BaseStrategy.js";
import { tokenService } from "../services/token.service.js";

export interface DCAConfig extends StrategyConfig {
  intervalMinutes: number; // How often to buy (e.g., every 60 minutes)
  amountPerOrder: number; // Amount to buy each time
  maxOrders?: number; // Optional: stop after N orders
  priceThreshold?: {
    enabled: boolean;
    maxPrice?: number; // Don't buy if price is above this
    minPrice?: number; // Don't buy if price is below this
  };
}

/**
 * DCA (Dollar-Cost Averaging) Strategy
 *
 * Automatically buys a fixed amount at regular intervals.
 * Example: Buy 10 MIN every hour, regardless of price
 */
export class DCAStrategy extends BaseStrategy {
  private strategyConfig: DCAConfig;
  private ordersCreated = 0;
  private lastOrderTime?: Date;

  constructor(config: DCAConfig) {
    super(config);
    this.strategyConfig = config;
  }

  validate(): boolean {
    if (this.strategyConfig.intervalMinutes <= 0) {
      this.log("❌ Invalid interval (must be > 0)");
      return false;
    }

    if (this.strategyConfig.amountPerOrder <= 0) {
      this.log("❌ Invalid order amount (must be > 0)");
      return false;
    }

    return true;
  }

  async execute(): Promise<void> {
    try {
      if (!this.config.isActive) {
        return;
      }

      // Check if max orders reached
      if (
        this.strategyConfig.maxOrders &&
        this.ordersCreated >= this.strategyConfig.maxOrders
      ) {
        this.log(
          `🎯 Max orders (${this.strategyConfig.maxOrders}) reached. Stopping.`
        );
        this.config.isActive = false;
        return;
      }

      // Check if enough time has passed since last order
      const now = new Date();
      if (this.lastOrderTime) {
        const minutesSinceLastOrder =
          (now.getTime() - this.lastOrderTime.getTime()) / 1000 / 60;

        if (minutesSinceLastOrder < this.strategyConfig.intervalMinutes) {
          const remaining =
            this.strategyConfig.intervalMinutes - minutesSinceLastOrder;
          this.log(`⏳ Next order in ${remaining.toFixed(1)} minutes`);
          return;
        }
      }

      // Get current price
      const currentPrice = await this.getCurrentPrice();
      if (!currentPrice) {
        this.log("❌ Could not fetch current price");
        return;
      }

      // Check price thresholds
      if (this.strategyConfig.priceThreshold?.enabled) {
        const { maxPrice, minPrice } = this.strategyConfig.priceThreshold;

        if (maxPrice && currentPrice > maxPrice) {
          this.log(
            `⚠️ Price ${currentPrice.toFixed(
              6
            )} above max threshold ${maxPrice.toFixed(6)}. Skipping order.`
          );
          this.lastOrderTime = now;
          return;
        }

        if (minPrice && currentPrice < minPrice) {
          this.log(
            `⚠️ Price ${currentPrice.toFixed(
              6
            )} below min threshold ${minPrice.toFixed(6)}. Skipping order.`
          );
          this.lastOrderTime = now;
          return;
        }
      }

      // Create market buy order
      await this.createDCAOrder(currentPrice);
    } catch (error) {
      this.log(`❌ Error executing DCA: ${(error as Error).message}`);
    }
  }

  private async getCurrentPrice(): Promise<number | null> {
    try {
      const policyId = this.config.baseToken.split(".")[0];
      const token = await tokenService.getTokenByPolicyId(policyId, 5);
      return token ? token.price_ada : null;
    } catch (error) {
      this.log(`❌ Error fetching price: ${(error as Error).message}`);
      return null;
    }
  }

  private async createDCAOrder(currentPrice: number) {
    const triggerPrice = currentPrice * 1.001; // 0.1% above current

    this.log(
      `📝 Creating DCA BUY order #${this.ordersCreated + 1}: ${
        this.strategyConfig.amountPerOrder
      } ${this.config.baseToken} at ~${currentPrice.toFixed(6)} ${
        this.config.quoteToken
      }`
    );

    const order = await this.createOrder({
      targetPrice: triggerPrice,
      triggerAbove: false,
      isBuy: true,
      amount: this.strategyConfig.amountPerOrder,
    });

    this.ordersCreated++;
    this.lastOrderTime = new Date();
    this.lastExecutionTime = new Date();

    this.log(
      `✅ DCA order created: ${order.id} (${this.ordersCreated}/${
        this.strategyConfig.maxOrders || "∞"
      })`
    );
  }

  getStatus(): object {
    const nextOrderIn = this.lastOrderTime
      ? Math.max(
          0,
          this.strategyConfig.intervalMinutes -
            (Date.now() - this.lastOrderTime.getTime()) / 1000 / 60
        )
      : 0;

    return {
      strategy: "DCA",
      name: this.config.name,
      tradingPair: this.config.tradingPair,
      intervalMinutes: this.strategyConfig.intervalMinutes,
      amountPerOrder: this.strategyConfig.amountPerOrder,
      ordersCreated: this.ordersCreated,
      maxOrders: this.strategyConfig.maxOrders || "unlimited",
      isActive: this.config.isActive,
      lastOrderTime: this.lastOrderTime,
      nextOrderInMinutes: nextOrderIn.toFixed(1),
      priceThreshold: this.strategyConfig.priceThreshold,
    };
  }
}
