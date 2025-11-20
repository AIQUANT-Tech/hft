// src/strategies/GridStrategy.ts

import { BaseStrategy, StrategyConfig } from "./BaseStrategy.js";
import { tradingBotService } from "../services/tradingBot.service.js";
import { logger } from "../services/logger.service.js";
import { PriceUtil } from "../utils/price.util.js";
import { TradeOrder } from "../models/tradeOrder.model.js";

export interface GridConfig extends StrategyConfig {
  poolId: string;
  lowerPrice: number; // Lower bound of grid
  upperPrice: number; // Upper bound of grid
  gridLevels: number; // Number of grid levels (e.g., 10)
  investmentPerGrid: number; // ADA to invest per grid level
  executeOnce: boolean; // Stop after one complete cycle
  gridOrders: Map<number, { buyOrderId?: string; sellOrderId?: string }>; // Track orders per grid level
  profitPerGrid: number; // Profit taken per grid execution
  totalProfit: number; // Cumulative profit
}

export class GridStrategy extends BaseStrategy {
  config: GridConfig;
  private gridSpacing: number;

  constructor(config: GridConfig) {
    super(config);
    this.config = config;

    // Calculate grid spacing
    this.gridSpacing =
      (this.config.upperPrice - this.config.lowerPrice) /
      (this.config.gridLevels - 1);

    // Initialize grid orders tracking
    if (!this.config.gridOrders) {
      this.config.gridOrders = new Map();
      for (let i = 0; i < this.config.gridLevels; i++) {
        this.config.gridOrders.set(i, {});
      }
    }

    if (this.config.profitPerGrid === undefined) {
      this.config.profitPerGrid = 0;
    }

    if (this.config.totalProfit === undefined) {
      this.config.totalProfit = 0;
    }
  }

  validate(): boolean {
    if (this.config.lowerPrice >= this.config.upperPrice) {
      this.log("❌ Lower price must be less than upper price");
      return false;
    }

    if (this.config.gridLevels < 2) {
      this.log("❌ Grid levels must be at least 2");
      return false;
    }

    if (this.config.investmentPerGrid <= 0) {
      this.log("❌ Investment per grid must be positive");
      return false;
    }

    return true;
  }

  async execute(): Promise<void> {
    if (!this.config.isActive) {
      return;
    }

    try {
      // Get current price
      const currentPrice = await this.getCurrentPrice();

      if (!currentPrice) {
        logger.warning(
          `No price available for ${this.config.tradingPair}`,
          this.config.name,
          "strategy"
        );
        return;
      }
      const priceStr = currentPrice.toFixed(20);
      const trimmed = priceStr.replace(/\.?0+$/, "");

      logger.info(
        `Current ${this.config.tradingPair} price: ${trimmed} ADA`,
        this.config.name,
        "strategy"
      );

      // Check if price is within grid range
      if (
        currentPrice < this.config.lowerPrice ||
        currentPrice > this.config.upperPrice
      ) {
        logger.warning(
          `Price ${currentPrice.toFixed(8)} outside grid range [${
            this.config.lowerPrice
          }, ${this.config.upperPrice}]`,
          this.config.name,
          "strategy"
        );
        return;
      }

      // Place orders at each grid level
      await this.manageGridOrders(currentPrice);
    } catch (error) {
      logger.error(
        `Grid execution error: ${(error as Error).message}`,
        this.config.name,
        "strategy"
      );
    }
  }

  private async manageGridOrders(currentPrice: number): Promise<void> {
    for (let i = 0; i < this.config.gridLevels; i++) {
      const gridPrice = this.config.lowerPrice + i * this.gridSpacing;
      const gridOrders = this.config.gridOrders.get(i);

      if (!gridOrders) continue;

      // BUY ORDERS: Place below current price
      if (gridPrice < currentPrice && !gridOrders.buyOrderId) {
        await this.placeBuyOrder(i, gridPrice);
      }

      // SELL ORDERS: Place above current price
      if (gridPrice > currentPrice && !gridOrders.sellOrderId) {
        await this.placeSellOrder(i, gridPrice);
      }

      // Check if orders are completed and create counter-orders
      await this.checkAndCreateCounterOrders(i, gridPrice);
    }
  }

  private async placeBuyOrder(
    gridLevel: number,
    gridPrice: number
  ): Promise<void> {
    try {
      const tokenAmount = this.config.investmentPerGrid / gridPrice;

      const order = await tradingBotService.createOrder({
        walletAddress: this.config.walletAddress,
        tradingPair: this.config.tradingPair,
        baseToken: this.config.baseToken,
        quoteToken: this.config.quoteToken,
        targetPrice: gridPrice,
        triggerAbove: false, // Buy when price drops to this level
        isBuy: true,
        amount: tokenAmount,
        poolId: this.config.poolId,
      });

      const gridOrders = this.config.gridOrders.get(gridLevel);
      if (gridOrders) {
        gridOrders.buyOrderId = order.id;
      }

      logger.info(
        `Grid ${gridLevel}: BUY order placed at ${gridPrice.toFixed(8)} ADA`,
        this.config.name,
        "strategy"
      );
    } catch (error) {
      logger.error(
        `Failed to place buy order at grid ${gridLevel}: ${
          (error as Error).message
        }`,
        this.config.name,
        "strategy"
      );
    }
  }

  private async placeSellOrder(
    gridLevel: number,
    gridPrice: number
  ): Promise<void> {
    try {
      const tokenAmount = this.config.investmentPerGrid / gridPrice;

      const order = await tradingBotService.createOrder({
        walletAddress: this.config.walletAddress,
        tradingPair: this.config.tradingPair,
        baseToken: this.config.baseToken,
        quoteToken: this.config.quoteToken,
        targetPrice: gridPrice,
        triggerAbove: true, // Sell when price rises to this level
        isBuy: false,
        amount: tokenAmount,
        poolId: this.config.poolId,
      });

      const gridOrders = this.config.gridOrders.get(gridLevel);
      if (gridOrders) {
        gridOrders.sellOrderId = order.id;
      }

      logger.info(
        `Grid ${gridLevel}: SELL order placed at ${gridPrice.toFixed(8)} ADA`,
        this.config.name,
        "strategy"
      );
    } catch (error) {
      logger.error(
        `Failed to place sell order at grid ${gridLevel}: ${
          (error as Error).message
        }`,
        this.config.name,
        "strategy"
      );
    }
  }

  private async checkAndCreateCounterOrders(
    gridLevel: number,
    gridPrice: number
  ): Promise<void> {
    const gridOrders = this.config.gridOrders.get(gridLevel);
    if (!gridOrders) return;

    // Check if BUY order completed -> place SELL order above it
    if (gridOrders.buyOrderId) {
      const buyOrder = await TradeOrder.findByPk(gridOrders.buyOrderId);

      if (buyOrder && buyOrder.status === "completed") {
        logger.success(
          `Grid ${gridLevel}: BUY completed at ${gridPrice.toFixed(8)} ADA`,
          this.config.name,
          "strategy"
        );

        // Place sell order at next grid level
        const sellPrice = gridPrice + this.gridSpacing;
        const tokenAmount = this.config.investmentPerGrid / gridPrice;

        const sellOrder = await tradingBotService.createOrder({
          walletAddress: this.config.walletAddress,
          tradingPair: this.config.tradingPair,
          baseToken: this.config.baseToken,
          quoteToken: this.config.quoteToken,
          targetPrice: sellPrice,
          triggerAbove: true,
          isBuy: false,
          amount: tokenAmount,
          poolId: this.config.poolId,
        });

        gridOrders.sellOrderId = sellOrder.id;
        gridOrders.buyOrderId = undefined; // Clear buy order

        logger.info(
          `Grid ${gridLevel}: SELL order placed at ${sellPrice.toFixed(8)} ADA`,
          this.config.name,
          "strategy"
        );
      }
    }

    // Check if SELL order completed -> place BUY order below it
    if (gridOrders.sellOrderId) {
      const sellOrder = await TradeOrder.findByPk(gridOrders.sellOrderId);

      if (sellOrder && sellOrder.status === "completed") {
        logger.success(
          `Grid ${gridLevel}: SELL completed at ${gridPrice.toFixed(8)} ADA`,
          this.config.name,
          "strategy"
        );

        // Calculate profit
        const profit =
          this.gridSpacing * (this.config.investmentPerGrid / gridPrice);
        this.config.profitPerGrid = profit;
        this.config.totalProfit += profit;

        logger.success(
          `Grid ${gridLevel}: Profit captured: ${profit.toFixed(
            8
          )} ADA (Total: ${this.config.totalProfit.toFixed(8)} ADA)`,
          this.config.name,
          "strategy"
        );

        // Place buy order at previous grid level
        const buyPrice = gridPrice - this.gridSpacing;
        const tokenAmount = this.config.investmentPerGrid / buyPrice;

        const buyOrder = await tradingBotService.createOrder({
          walletAddress: this.config.walletAddress,
          tradingPair: this.config.tradingPair,
          baseToken: this.config.baseToken,
          quoteToken: this.config.quoteToken,
          targetPrice: buyPrice,
          triggerAbove: false,
          isBuy: true,
          amount: tokenAmount,
          poolId: this.config.poolId,
        });

        gridOrders.buyOrderId = buyOrder.id;
        gridOrders.sellOrderId = undefined; // Clear sell order

        logger.info(
          `Grid ${gridLevel}: BUY order placed at ${buyPrice.toFixed(8)} ADA`,
          this.config.name,
          "strategy"
        );

        // Stop if executeOnce
        if (this.config.executeOnce) {
          this.config.isActive = false;
          logger.warning(
            `Strategy stopped after completing one grid cycle`,
            this.config.name,
            "strategy"
          );
        }
      }
    }
  }

  getStatus(): object {
    const activeOrders = Array.from(this.config.gridOrders.values()).filter(
      (orders) => orders.buyOrderId || orders.sellOrderId
    ).length;

    return {
      name: this.config.name,
      type: "Grid Trading",
      tradingPair: this.config.tradingPair,
      lowerPrice: this.config.lowerPrice,
      upperPrice: this.config.upperPrice,
      gridLevels: this.config.gridLevels,
      gridSpacing: this.gridSpacing.toFixed(8),
      investmentPerGrid: this.config.investmentPerGrid,
      activeOrders,
      totalProfit: this.config.totalProfit.toFixed(8),
      profitPerGrid: this.config.profitPerGrid.toFixed(8),
      isActive: this.config.isActive,
      executeOnce: this.config.executeOnce,
    };
  }

  private async getCurrentPrice(): Promise<number | null> {
    return await PriceUtil.calculateTokenPrice(
      this.config.poolId,
      this.config.baseToken
    );
  }
}
