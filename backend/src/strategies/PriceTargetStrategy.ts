// src/strategies/PriceTargetStrategy.ts

import { BaseStrategy, StrategyConfig } from "./BaseStrategy.js";
import { PoolToken } from "../models/token.model.js";
import { TradeOrder } from "../models/tradeOrder.model.js";
import { BlockfrostAdapter, NetworkId, Asset } from "@minswap/sdk";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import environment from "../config/environment.js";
import Big from "big.js";

const blockfrostAPI = new BlockFrostAPI({
  projectId: environment.BLOCKFROST.PROJECT_ID,
});
const blockfrostAdapter = new BlockfrostAdapter({
  networkId: NetworkId.TESTNET,
  blockFrost: blockfrostAPI,
});

export interface PriceTargetConfig extends StrategyConfig {
  targetPrice: number;
  orderAmount: number;
  side: "BUY" | "SELL";
  triggerType: "ABOVE" | "BELOW";
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

  // src/strategies/PriceTargetStrategy.ts

  async execute(): Promise<void> {
    try {
      if (!this.config.isActive) {
        return;
      }

      await this.updateCurrentPrice();

      // ✅ Check if order exists and is completed
      if (this.orderId) {
        const order = await TradeOrder.findByPk(this.orderId);

        if (order) {
          if (order.status === "completed") {
            this.log(
              `✅ Order ${this.orderId} completed at ${order.executedPrice}`
            );

            // ✅ Stop strategy if executeOnce is true
            if (this.strategyConfig.executeOnce) {
              this.config.isActive = false;
              this.log("🛑 Strategy stopped (executeOnce mode)");
            } else {
              this.orderId = undefined;
              this.orderCreated = false;
            }
            return; // ✅ Exit here to prevent further execution
          }

          if (order.status === "pending") {
            // Strategy is waiting, don't do anything
            return;
          }

          if (order.status === "failed") {
            this.log(`❌ Order ${this.orderId} failed: ${order.errorMessage}`);

            // ✅ Reset order tracking
            this.orderId = undefined;
            this.orderCreated = false;

            // ✅ Stop if executeOnce
            if (this.strategyConfig.executeOnce) {
              this.config.isActive = false;
              this.log("🛑 Strategy stopped after failure (executeOnce mode)");
              return;
            }
          }
        }
      }

      // ✅ Only create new order if none exists
      if (!this.orderCreated) {
        await this.createNewOrder();
      }
    } catch (error) {
      this.log(`❌ Error executing strategy: ${(error as Error).message}`);
    }
  }

  private async updateCurrentPrice(): Promise<void> {
    try {
      const policyId = this.config.baseToken.split(".")[0];

      // ✅ Find pool in database
      const poolToken = await PoolToken.findOne({
        where: { policyId },
      });

      if (!poolToken) {
        this.log(`⚠️ Pool not found for ${policyId.substring(0, 8)}...`);
        return;
      }

      // ✅ Get pool data with correct property access
      const assetAStr = poolToken.get("assetA") as string;
      const assetBStr = poolToken.get("assetB") as string;

      // ✅ Parse assets
      const assetA: Asset =
        assetAStr === "lovelace" || assetAStr === ""
          ? { policyId: "", tokenName: "" }
          : assetAStr.length >= 56
          ? { policyId: assetAStr.slice(0, 56), tokenName: assetAStr.slice(56) }
          : { policyId: "", tokenName: "" };

      const assetB: Asset =
        assetBStr === "lovelace" || assetBStr === ""
          ? { policyId: "", tokenName: "" }
          : assetBStr.length >= 56
          ? { policyId: assetBStr.slice(0, 56), tokenName: assetBStr.slice(56) }
          : { policyId: "", tokenName: "" };

      // ✅ Get pool from DEX
      const pool = await blockfrostAdapter.getV2PoolByPair(assetA, assetB);

      if (!pool) {
        this.log("⚠️ Pool not found on DEX");
        return;
      }

      // ✅ Get LIVE price
      const [priceA, priceB] = await blockfrostAdapter.getV2PoolPrice({ pool });

      const isAAda = assetAStr === "lovelace" || assetAStr === "";
      const isBAda = assetBStr === "lovelace" || assetBStr === "";

      if (isAAda && !isBAda) {
        this.currentPrice = Number(
          Big(priceB.toString()).div(1_000_000).toString()
        );
      } else if (isBAda && !isAAda) {
        this.currentPrice = Number(
          Big(priceA.toString()).div(1_000_000).toString()
        );
      }

      this.lastPriceCheck = new Date();
      this.log(
        `📊 Current price: ${this.currentPrice?.toFixed(6)} ${
          this.config.quoteToken
        }`
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
