import { tradingBotService } from "../services/tradingBot.service.js";

export interface StrategyConfig {
  id: string;
  name: string;
  walletAddress: string;
  tradingPair: string;
  baseToken: string; // token being BOUGHT/ SOLD
  quoteToken: string; // token used to BUY/SELL
  isActive: boolean;
  poolId: string;

  entryPrice?: number;
  amount?: number;
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

  /**
   * Generic order creation
   */
  async createOrder(orderData: {
    targetPrice: number;
    triggerAbove: boolean;
    isBuy: boolean;
    amount: number;
  }) {
    const poolId = this.config.poolId;

    if (!poolId) {
      throw new Error("Pool ID is required for creating orders");
    }

    // High precision cleanup
    const priceStr = orderData.targetPrice.toFixed(20);
    orderData.targetPrice = Number(priceStr.replace(/\.?0+$/, ""));

    return await tradingBotService.createOrder({
      walletAddress: this.config.walletAddress,
      tradingPair: this.config.tradingPair,
      baseToken: this.config.baseToken,
      quoteToken: this.config.quoteToken,
      poolId,
      ...orderData,
    });
  }

  /**
   * Helper for BUY order at market price
   */
  async marketBuy(price: number, amount: number) {
    return await this.createOrder({
      targetPrice: price,
      triggerAbove: true, // Buy immediately (market)
      isBuy: true,
      amount,
    });
  }

  /**
   * Helper for SELL order at market price
   */
  async marketSell(price: number, amount: number) {
    return await this.createOrder({
      targetPrice: price,
      triggerAbove: false, // Sell immediately (market)
      isBuy: false,
      amount,
    });
  }

  protected log(message: string) {
    console.log(`[${this.config.name}] ${message}`);
  }
}
