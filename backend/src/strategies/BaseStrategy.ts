// src/strategies/BaseStrategy.ts

import { tradingBotService } from "../services/tradingBot.service.js";

export interface StrategyConfig {
  id: string;
  name: string;
  walletAddress: string;
  tradingPair: string;
  baseToken: string;
  quoteToken: string;
  isActive: boolean;
  poolId: string;
}

export abstract class BaseStrategy {
  public config: StrategyConfig;
  protected lastExecutionTime?: Date;

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  abstract execute(): Promise<void>;
  abstract validate(): boolean;
  abstract getStatus(): object;

  async createOrder(orderData: {
    targetPrice: number;
    triggerAbove: boolean;
    isBuy: boolean;
    amount: number;
  }) {
    // ✅ Get poolId from strategy config (for PriceTargetStrategy)
    const poolId = (this.config as any).poolId || this.config.poolId;

    if (!poolId) {
      throw new Error("Pool ID is required for creating orders");
    }

    return await tradingBotService.createOrder({
      walletAddress: this.config.walletAddress,
      tradingPair: this.config.tradingPair,
      baseToken: this.config.baseToken,
      quoteToken: this.config.quoteToken,
      poolId,
      ...orderData,
    });
  }

  protected log(message: string) {
    console.log(`[${this.config.name}] ${message}`);
  }
}
