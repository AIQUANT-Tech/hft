// src/strategies/StopLossTakeProfitStrategy.ts
import { BaseStrategy, StrategyConfig } from "./BaseStrategy.js";
import { TradeOrder } from "../models/tradeOrder.model.js";
import { PriceUtil } from "../utils/price.util.js";

export interface StopLossTakeProfitConfig extends StrategyConfig {
  // user wants to open a long position in base token and then sell to TP/SL
  amount: number; // amount of BASE token to buy/sell (units depend on createOrder expectations)
  stopLossPercent: number; // positive number e.g. 10 -> sell if price falls 10%
  takeProfitPercent: number; // positive number e.g. 20 -> sell if price rises 20%
  poolId: string;
  executeOnce?: boolean;
  slippagePercent?: number; // optional slippage tolerance when creating orders
}

type PositionState = {
  hasPosition: boolean;
  entryPrice?: number; // price at which base was bought (from executed buy order)
  baseAmount: number; // remaining base amount in position
  buyOrderId?: string;
  sellOrderId?: string;
};

export class StopLossTakeProfitStrategy extends BaseStrategy {
  private cfg: StopLossTakeProfitConfig;
  private state: PositionState = { hasPosition: false, baseAmount: 0 };
  private currentPrice?: number;
  private lastPriceCheck?: Date;

  constructor(config: StopLossTakeProfitConfig) {
    super(config);
    this.cfg = config;
    if (config.entryPrice && config.entryPrice > 0) {
      // if user passed entryPrice (rare), seed state
      this.state.entryPrice = config.entryPrice;
      this.state.hasPosition = true;
      this.state.baseAmount = config.amount;
    }
  }

  validate(): boolean {
    if (!this.cfg.poolId) {
      this.log("❌ poolId required");
      return false;
    }

    if (!this.cfg.amount || this.cfg.amount <= 0) {
      this.log("❌ Invalid amount");
      return false;
    }

    if (this.cfg.stopLossPercent < 0 || this.cfg.stopLossPercent > 1000) {
      this.log("❌ Invalid stopLossPercent");
      return false;
    }

    if (this.cfg.takeProfitPercent < 0 || this.cfg.takeProfitPercent > 10000) {
      this.log("❌ Invalid takeProfitPercent");
      return false;
    }

    return true;
  }

  async execute(): Promise<void> {
    try {
      if (!this.config.isActive) return;

      await this.updateCurrentPrice();
      if (!this.currentPrice) return;

      // If we don't have a position yet => create initial BUY (market)
      if (!this.state.hasPosition) {
        await this.openInitialPosition();
        return; // wait for buy to complete in subsequent runs
      }

      // if buy is pending, check its status
      if (this.state.buyOrderId && !this.state.entryPrice) {
        await this.checkBuyOrder();
        return;
      }

      // If we have a position, check for SL/TP
      if (this.state.hasPosition && this.state.entryPrice) {
        await this.checkAndTriggerSell();
      }
    } catch (err) {
      this.log(`❌ execute error: ${(err as Error).message}`);
    }
  }

  // Fetch price (mid price from pool util) and set lastPriceCheck
  private async updateCurrentPrice(): Promise<void> {
    try {
      const p = await PriceUtil.calculateTokenPrice(
        this.cfg.poolId,
        this.config.baseToken
      );
      if (p === null) {
        this.log("⚠️ Unable to fetch current price");
        return;
      }
      this.currentPrice = p;
      this.lastPriceCheck = new Date();
      this.log(
        `📊 Price update: current=${this.currentPrice.toFixed(8)} entry=${
          this.state.entryPrice ? this.state.entryPrice.toFixed(8) : "N/A"
        }`
      );
    } catch (e) {
      this.log(`⚠️ price fetch error: ${(e as Error).message}`);
    }
  }

  // Create initial market BUY to open position
  private async openInitialPosition(): Promise<void> {
    // Avoid creating multiple buy orders
    if (this.state.buyOrderId) {
      this.log(
        `⏳ Buy already created (id=${this.state.buyOrderId}). Waiting...`
      );
      return;
    }

    if (!this.currentPrice) {
      this.log("⚠️ No current price, can't open position");
      return;
    }

    this.log(
      `💸 Opening initial BUY for ${this.cfg.amount} ${this.config.baseToken} at market`
    );

    // create order - use market buy semantics: set targetPrice as currentPrice and flag triggerAbove true to match your API
    // If your createOrder supports a isMarket flag, prefer that.
    const order = await this.createOrder({
      targetPrice: this.currentPrice, // price hint
      triggerAbove: true, // for buys we want it to execute now; adapt if createOrder API has market flag
      isBuy: true,
      amount: this.cfg.amount,
    });

    this.state.buyOrderId = order.id;
    this.log(`📝 Buy order created id=${order.id}, status=${order.status}`);
  }

  // Poll buy order status and capture executedPrice when completed
  private async checkBuyOrder(): Promise<void> {
    if (!this.state.buyOrderId) return;

    const order = await TradeOrder.findByPk(this.state.buyOrderId);
    if (!order) {
      this.log(`❌ Buy order ${this.state.buyOrderId} not found`);
      this.state.buyOrderId = undefined;
      return;
    }

    if (order.status === "pending") {
      this.log(`⏳ Buy order ${order.id} still pending`);
      return;
    }

    if (order.status === "failed") {
      this.log(`❌ Buy order ${order.id} failed: ${order.errorMessage}`);
      // reset and optionally stop strategy if executeOnce?
      this.state.buyOrderId = undefined;
      if (this.cfg.executeOnce) {
        this.config.isActive = false;
        this.log("🛑 Stopping strategy due to buy failure (executeOnce)");
      }
      return;
    }

    if (order.status === "completed") {
      const executedPrice = Number(
        order.executedPrice || this.currentPrice || 0
      );
      const filled = Number(order.amount || this.cfg.amount);
      this.state.entryPrice = executedPrice;
      this.state.baseAmount = filled;
      this.state.hasPosition = filled > 0;
      this.log(
        `✅ Buy completed id=${order.id} price=${executedPrice} filled=${filled}`
      );
      // clear buy order id after capture
      this.state.buyOrderId = undefined;
    }
  }

  // If in position, check for SL/TP and create appropriate sell order
  private async checkAndTriggerSell(): Promise<void> {
    if (!this.currentPrice || !this.state.entryPrice || !this.state.hasPosition)
      return;

    const priceChangePercent =
      ((this.currentPrice - this.state.entryPrice) / this.state.entryPrice) *
      100;

    // TAKE PROFIT: create limit sell at target price (entry * (1 + tp%/100))
    const takeProfitTrigger = this.cfg.takeProfitPercent;
    const takeProfitReached = priceChangePercent >= takeProfitTrigger;

    // STOP LOSS: sell immediately (market) if dropped below threshold
    const stopLossTrigger = -this.cfg.stopLossPercent;
    const stopLossReached = priceChangePercent <= stopLossTrigger;

    if (takeProfitReached) {
      this.log(
        `✅ TAKE PROFIT reached: ${priceChangePercent.toFixed(
          2
        )}% >= ${takeProfitTrigger}%`
      );
      await this.createSellForTakeProfit();
      return;
    }

    if (stopLossReached) {
      this.log(
        `❌ STOP LOSS reached: ${priceChangePercent.toFixed(
          2
        )}% <= ${stopLossTrigger}%`
      );
      await this.createSellForStopLoss();
      return;
    }

    this.log(
      `🔎 Monitoring: change=${priceChangePercent.toFixed(
        2
      )}% (TP ${takeProfitTrigger}%, SL ${this.cfg.stopLossPercent}%)`
    );
  }

  // Create a limit sell at the desired TP price (or market if you prefer)
  private async createSellForTakeProfit(): Promise<void> {
    if (this.state.sellOrderId) {
      this.log(
        `⏳ Sell already created (id=${this.state.sellOrderId}). Waiting...`
      );
      return;
    }

    const targetPrice =
      this.state.entryPrice! * (1 + this.cfg.takeProfitPercent / 100);
    this.log(
      `📈 Creating TAKE PROFIT LIMIT sell at ${targetPrice.toFixed(8)} for ${
        this.state.baseAmount
      }`
    );

    const order = await this.createOrder({
      targetPrice,
      triggerAbove: true, // execute when price >= target
      isBuy: false,
      amount: this.state.baseAmount,
    });

    this.state.sellOrderId = order.id;
    this.log(
      `📝 TakeProfit sell created id=${order.id} status=${order.status}`
    );
    // next runs will poll the order via checkSellOrder()
    await this.checkSellOrder(); // optionally immediate check
  }

  // Create a market sell immediately when stoploss reached
  private async createSellForStopLoss(): Promise<void> {
    if (this.state.sellOrderId) {
      this.log(
        `⏳ Sell already created (id=${this.state.sellOrderId}). Waiting...`
      );
      return;
    }

    // choose market sell: set targetPrice = currentPrice and triggerAbove = false so it executes now
    const targetPrice = this.currentPrice!;
    this.log(
      `🛑 Creating STOP LOSS MARKET sell at market price ${targetPrice.toFixed(
        8
      )} for ${this.state.baseAmount}`
    );

    const order = await this.createOrder({
      targetPrice,
      triggerAbove: false, // execute immediately / on or below
      isBuy: false,
      amount: this.state.baseAmount,
    });

    this.state.sellOrderId = order.id;
    this.log(`📝 StopLoss sell created id=${order.id} status=${order.status}`);
    await this.checkSellOrder();
  }

  // Poll sell order status and finalize position
  private async checkSellOrder(): Promise<void> {
    if (!this.state.sellOrderId) return;

    const order = await TradeOrder.findByPk(this.state.sellOrderId);
    if (!order) {
      this.log(`❌ Sell order ${this.state.sellOrderId} not found`);
      this.state.sellOrderId = undefined;
      return;
    }

    if (order.status === "pending") {
      this.log(`⏳ Sell order ${order.id} pending`);
      return;
    }

    if (order.status === "failed") {
      this.log(`❌ Sell order ${order.id} failed: ${order.errorMessage}`);
      // reset sell order and optionally stop or retry
      this.state.sellOrderId = undefined;
      if (this.cfg.executeOnce) {
        this.config.isActive = false;
        this.log("🛑 Strategy stopped after sell failure (executeOnce)");
      }
      return;
    }

    if (order.status === "completed") {
      const executed = Number(order.executedPrice || this.currentPrice || 0);
      const filled = Number(order.amount || this.state.baseAmount);
      this.log(
        `✅ Sell completed id=${order.id} price=${executed} filled=${filled}`
      );

      // Close position
      this.state = { hasPosition: false, baseAmount: 0 };
      // clear sell order id
      this.state.sellOrderId = undefined;

      // If executeOnce, stop strategy
      if (this.cfg.executeOnce) {
        this.config.isActive = false;
        this.log("🛑 Strategy stopped after successful sell (executeOnce)");
      }
    }
  }

  // Called by UI / monitoring to fetch current status
  getStatus(): object {
    const entry = this.state.entryPrice ?? 0;
    const cur = this.currentPrice ?? 0;
    const pct = entry > 0 ? ((cur - entry) / entry) * 100 : 0;
    return {
      strategy: "sltp",
      type: "sltp",
      name: this.config.name,
      tradingPair: this.config.tradingPair,
      entryPrice: Number(entry.toFixed(8)),
      currentPrice: Number(cur.toFixed(8)),
      priceChangePercent: Number(pct.toFixed(4)),
      stopLossPercent: this.cfg.stopLossPercent,
      takeProfitPercent: this.cfg.takeProfitPercent,
      hasPosition: this.state.hasPosition,
      positionAmount: Number(this.state.baseAmount),
      buyOrderId: this.state.buyOrderId,
      sellOrderId: this.state.sellOrderId,
      lastPriceCheck: this.lastPriceCheck?.toISOString(),
      isActive: this.config.isActive,
    };
  }
}
