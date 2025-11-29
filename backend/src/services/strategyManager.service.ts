// src/services/strategyManager.service.ts
import { BaseStrategy } from "../strategies/BaseStrategy.js";
import {
  PriceTargetStrategy,
  PriceTargetConfig,
} from "../strategies/PriceTargetStrategy.js";
import { ACAStrategy, ACAConfig } from "../strategies/ACAStrategy.js";
import { logger } from "./logger.service.js";
import { GridConfig, GridStrategy } from "../strategies/GridStrategy.js";
import {
  StopLossTakeProfitStrategy,
  StopLossTakeProfitConfig,
} from "../strategies/StopLossTakeProfitStrategy.js";
import { strategyService } from "./strategy.service.js";

export class StrategyManagerService {
  private strategies: Map<string, BaseStrategy> = new Map();
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;
  private checkInterval = 30000; // Check every 30 seconds

  async start() {
    if (this.isRunning) {
      logger.warning("Strategy manager already running", undefined, "system");
      return;
    }

    this.isRunning = true;
    logger.success("Strategy manager started", undefined, "system");

    await this.executeStrategies();

    this.intervalId = setInterval(async () => {
      await this.executeStrategies();
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    logger.warning("Strategy manager stopped", undefined, "system");
  }

  private async executeStrategies() {
    if (this.strategies.size === 0) {
      return;
    }

    logger.info(
      `Executing ${this.strategies.size} active strategy(ies)`,
      undefined,
      "strategy"
    );

    for (const [id, strategy] of this.strategies) {
      try {
        // Only execute if strategy is active
        if (strategy.config?.isActive) {
          await strategy.execute();
        }
      } catch (error) {
        logger.error(
          `Error executing strategy ${id}: ${(error as Error).message}`,
          strategy.config?.name,
          "strategy"
        );
      }
    }
  }

  async addPriceTargetStrategy(config: PriceTargetConfig): Promise<string> {
    const strategy = new PriceTargetStrategy(config);

    if (!strategy.validate()) {
      logger.error("Invalid strategy configuration", config.name, "strategy");
      throw new Error("Invalid strategy configuration");
    }

    this.strategies.set(config.id, strategy);

    // ✅ Save to database
    await strategyService.upsertStrategy({
      id: config.id,
      walletAddress: config.walletAddress,
      name: config.name,
      type: "price-target",
      tradingPair: config.tradingPair,
      baseToken: config.baseToken,
      quoteToken: config.quoteToken,
      investedAmount: config.orderAmount?.toString() || "0",
      config: config,
    });

    logger.success(`Price Target strategy added`, config.name, "strategy");

    return config.id;
  }

  // ✅ Add ACA Strategy
  async addACAStrategy(config: ACAConfig): Promise<string> {
    const strategy = new ACAStrategy(config);

    if (!strategy.validate()) {
      logger.error(
        "Invalid ACA strategy configuration",
        config.name,
        "strategy"
      );
      throw new Error("Invalid ACA strategy configuration");
    }

    this.strategies.set(config.id, strategy);
    // ✅ Save to database
    await strategyService.upsertStrategy({
      id: config.id,
      walletAddress: config.walletAddress,
      name: config.name,
      type: "dca",
      tradingPair: config.tradingPair,
      baseToken: config.baseToken,
      quoteToken: config.quoteToken,
      investedAmount: config.investmentAmount?.toString() || "0",
      config: config,
    });

    logger.success(`ACA strategy added`, config.name, "strategy");

    return config.id;
  }

  async addGridStrategy(config: GridConfig): Promise<string> {
    const strategy = new GridStrategy(config);

    if (!strategy.validate()) {
      logger.error(
        "Invalid Grid strategy configuration",
        config.name,
        "strategy"
      );
      throw new Error("Invalid Grid strategy configuration");
    }

    this.strategies.set(config.id, strategy);
    // ✅ Save to database
    await strategyService.upsertStrategy({
      id: config.id,
      walletAddress: config.walletAddress,
      name: config.name,
      type: "grid",
      tradingPair: config.tradingPair,
      baseToken: config.baseToken,
      quoteToken: config.quoteToken,
      investedAmount: config.lastProcessedPrice?.toString() || "0",
      config: config,
    });

    logger.success(`Grid strategy added`, config.name, "strategy");

    return config.id;
  }

  async addStopLossTakeProfitStrategy(
    config: StopLossTakeProfitConfig
  ): Promise<string> {
    const strategy = new StopLossTakeProfitStrategy(config);

    if (!strategy.validate()) {
      logger.error(
        "Invalid Stop Loss/Take Profit configuration",
        config.name,
        "strategy"
      );
      throw new Error("Invalid Stop Loss/Take Profit configuration");
    }

    this.strategies.set(config.id, strategy);

    // ✅ Save to database with correct investedAmount (token amount * entry price)
    const investedAmountAda = (
      config.amount * (config.entryPrice ?? 0)
    ).toFixed(6);

    await strategyService.upsertStrategy({
      id: config.id,
      walletAddress: config.walletAddress,
      name: config.name,
      type: "sltp",
      tradingPair: config.tradingPair,
      baseToken: config.baseToken,
      quoteToken: config.quoteToken,
      investedAmount: investedAmountAda,
      config: config,
    });

    logger.success(
      `🛡️ Stop Loss/Take Profit strategy added: SL:${config.stopLossPercent}% TP:${config.takeProfitPercent}%`,
      config.name,
      "strategy"
    );

    return config.id;
  }

  removeStrategy(id: string): boolean {
    const strategy = this.strategies.get(id);
    const removed = this.strategies.delete(id);

    if (removed) {
      logger.warning(`Strategy removed`, strategy?.config?.name, "strategy");
    } else {
      logger.error(`Failed to remove strategy: ${id}`, undefined, "strategy");
    }

    return removed;
  }

  stopStrategy(id: string): boolean {
    const strategy = this.strategies.get(id);

    if (strategy) {
      strategy.config.isActive = false;
      logger.warning(
        `Strategy stopped by user`,
        strategy.config.name,
        "strategy"
      );
      return true;
    }

    return false;
  }

  startStrategy(id: string): boolean {
    const strategy = this.strategies.get(id);

    if (strategy) {
      strategy.config.isActive = true;
      logger.success(
        `Strategy started by user`,
        strategy.config.name,
        "strategy"
      );
      return true;
    }

    return false;
  }

  getStrategy(id: string): BaseStrategy | undefined {
    return this.strategies.get(id);
  }

  getAllStrategies(): Array<{ id: string; status: object }> {
    return Array.from(this.strategies.entries()).map(([id, strategy]) => ({
      id,
      status: strategy.getStatus(),
    }));
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      activeStrategies: this.strategies.size,
    };
  }

  /**
   * NEW: Return active strategies.
   * If walletAddress is passed, filter active strategies by owner/wallet keys commonly used in configs.
   * Returns array of objects: { id, config, status }
   */
  getAllActiveStrategies(walletAddress: string) {
    const active = Array.from(this.strategies.values()).filter(
      (s) => s.config?.isActive
    );

    if (!walletAddress) {
      return active.map((s) => ({
        id: s.config?.id,
        config: s.config,
        status: s.getStatus(),
      }));
    }

    return active.map((s) => ({
      id: s.config?.id,
      config: s.config,
      status: s.getStatus(),
    }));
  }
}

export const strategyManager = new StrategyManagerService();
