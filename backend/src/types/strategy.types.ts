// src/types/strategy.types.ts

export type StrategyType = "PRICE_TARGET" | "DCA" | "GRID_TRADING";

export interface BaseStrategyConfig {
  id: string;
  name: string;
  type: StrategyType;
  walletAddress: string;
  tradingPair: string;
  baseToken: string;
  quoteToken: string;
  isActive: boolean;
  executeOnce: boolean; // ✅ Run once or continuous
}

export interface PriceTargetConfig extends BaseStrategyConfig {
  type: "PRICE_TARGET";
  targetPrice: number;
  orderAmount: number;
  side: "BUY" | "SELL";
  triggerType: "ABOVE" | "BELOW";
}

export interface DCAConfig extends BaseStrategyConfig {
  type: "DCA";
  investmentAmount: number; // ADA to spend per interval
  intervalMinutes: number; // How often to buy (e.g., 60 = hourly)
  totalRuns?: number; // Optional: limit total executions
}

export interface GridTradingConfig extends BaseStrategyConfig {
  type: "GRID_TRADING";
  lowerPrice: number; // Bottom of grid
  upperPrice: number; // Top of grid
  gridLevels: number; // Number of buy/sell levels
  investmentPerLevel: number; // ADA to allocate per grid level
}
