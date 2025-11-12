// src/services/strategyManager.service.ts

import { BaseStrategy } from "../strategies/BaseStrategy.js";
import {
  PriceTargetStrategy,
  PriceTargetConfig,
} from "../strategies/PriceTargetStrategy.js";

export class StrategyManagerService {
  private strategies: Map<string, BaseStrategy> = new Map();
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;
  private checkInterval = 30000; // Check every 30 seconds

  async start() {
    if (this.isRunning) {
      console.log("Strategy manager already running");
      return;
    }

    this.isRunning = true;
    console.log("🎯 Strategy manager started");

    // Run initial check
    await this.executeStrategies();

    // Schedule periodic checks
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
    console.log("🛑 Strategy manager stopped");
  }

  private async executeStrategies() {
    for (const [id, strategy] of this.strategies) {
      try {
        await strategy.execute();
      } catch (error) {
        console.error(`Error executing strategy ${id}:`, error);
      }
    }
  }

  addPriceTargetStrategy(config: PriceTargetConfig): string {
    const strategy = new PriceTargetStrategy(config);

    if (!strategy.validate()) {
      throw new Error("Invalid strategy configuration");
    }

    this.strategies.set(config.id, strategy);
    console.log(`Added PriceTarget strategy: ${config.name}`);

    return config.id;
  }

  removeStrategy(id: string): boolean {
    const removed = this.strategies.delete(id);
    if (removed) {
      console.log(`❌ Removed strategy: ${id}`);
    }
    return removed;
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
}

export const strategyManager = new StrategyManagerService();
