// src/strategies/GridStrategy.ts

import { BaseStrategy, StrategyConfig } from "./BaseStrategy.js";
import { tradingBotService } from "../services/tradingBot.service.js";
import { logger } from "../services/logger.service.js";
import { PriceUtil } from "../utils/price.util.js";
import { TradeOrder } from "../models/tradeOrder.model.js";

export interface GridConfig extends StrategyConfig {
  poolId: string;
  lowerPrice: number;
  upperPrice: number;
  gridLevels: number;
  investmentPerGrid: number;
  executeOnce: boolean;
  gridOrders: Map<number, { buyOrderId?: string; sellOrderId?: string }>;
  profitPerGrid: number;
  totalProfit: number;
  lastProcessedPrice?: number;
}

// src/strategies/GridStrategy.ts

export class GridStrategy extends BaseStrategy {
  config: GridConfig;
  private gridSpacing: number;
  private gridPrices: number[];
  private gridLevels: number;
  private initialOrdersPlaced: boolean = false; // ✅ Add this flag

  constructor(config: GridConfig) {
    super(config);
    this.config = config;
    this.gridLevels = config.gridLevels;

    this.gridSpacing =
      (this.config.upperPrice - this.config.lowerPrice) /
      (this.config.gridLevels - 1);

    this.gridPrices = [];
    for (let i = 0; i < this.config.gridLevels; i++) {
      this.gridPrices.push(this.config.lowerPrice + i * this.gridSpacing);
    }

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

    logger.info(
      `Grid setup: ${
        this.config.gridLevels
      } levels from ${this.config.lowerPrice.toFixed(
        12
      )} to ${this.config.upperPrice.toFixed(12)} ADA`,
      this.config.name,
      "strategy"
    );
    logger.info(
      `Grid spacing: ${this.gridSpacing.toFixed(12)} ADA per level`,
      this.config.name,
      "strategy"
    );
  }

  async execute(): Promise<void> {
    if (!this.config.isActive) {
      return;
    }

    try {
      const currentPrice = await this.getCurrentPrice();

      if (!currentPrice) {
        logger.warning(
          `No price available for ${this.config.tradingPair}`,
          this.config.name,
          "strategy"
        );
        return;
      }

      const priceStr = currentPrice.toFixed(20).replace(/\.?0+$/, "");
      logger.info(
        `Current ${this.config.tradingPair} price: ${priceStr} ADA`,
        this.config.name,
        "strategy"
      );

      if (
        currentPrice < this.config.lowerPrice ||
        currentPrice > this.config.upperPrice
      ) {
        logger.warning(
          `Price ${currentPrice.toFixed(
            12
          )} outside grid range [${this.config.lowerPrice.toFixed(
            12
          )}, ${this.config.upperPrice.toFixed(12)}]`,
          this.config.name,
          "strategy"
        );
        return;
      }

      const currentGridLevel = this.findGridLevel(currentPrice);
      logger.info(
        `Current price at grid level ${currentGridLevel} (price: ${this.gridPrices[
          currentGridLevel
        ].toFixed(12)} ADA)`,
        this.config.name,
        "strategy"
      );

      // ✅ Place initial orders on first execution
      if (!this.initialOrdersPlaced) {
        await this.placeInitialOrders(currentGridLevel);
        this.initialOrdersPlaced = true;
        return; // Skip rest of execution on first run
      }

      await this.manageGridOrders(currentPrice, currentGridLevel);
      this.config.lastProcessedPrice = currentPrice;
    } catch (error) {
      logger.error(
        `Grid execution error: ${(error as Error).message}`,
        this.config.name,
        "strategy"
      );
    }
  }

  // ✅ NEW: Place all initial orders when strategy starts
  private async placeInitialOrders(currentGridLevel: number): Promise<void> {
    logger.info(
      `🚀 Placing initial grid orders (current level: ${currentGridLevel})...`,
      this.config.name,
      "strategy"
    );

    // Place BUY orders below current price
    for (let i = 0; i < currentGridLevel; i++) {
      await this.placeBuyOrder(i, this.gridPrices[i]);
    }

    // Place SELL orders above current price
    for (let i = currentGridLevel + 1; i < this.gridLevels; i++) {
      await this.placeSellOrder(i, this.gridPrices[i]);
    }

    logger.success(
      `✅ Initial grid orders placed: ${currentGridLevel} BUY orders, ${
        this.gridLevels - currentGridLevel - 1
      } SELL orders`,
      this.config.name,
      "strategy"
    );
  }

  private findGridLevel(price: number): number {
    for (let i = 0; i < this.gridPrices.length - 1; i++) {
      if (price >= this.gridPrices[i] && price < this.gridPrices[i + 1]) {
        return i;
      }
    }
    return this.gridPrices.length - 1;
  }

  private async manageGridOrders(
    currentPrice: number,
    currentGridLevel: number
  ): Promise<void> {
    // Check BUY orders below current level
    for (let i = 0; i < currentGridLevel; i++) {
      const gridPrice = this.gridPrices[i];
      const gridOrders = this.config.gridOrders.get(i);

      if (!gridOrders) continue;

      if (!gridOrders.buyOrderId) {
        await this.placeBuyOrder(i, gridPrice);
      } else {
        await this.checkBuyOrderCompletion(i, gridPrice);
      }
    }

    // Check SELL orders above current level
    for (let i = currentGridLevel + 1; i < this.gridLevels; i++) {
      const gridPrice = this.gridPrices[i];
      const gridOrders = this.config.gridOrders.get(i);

      if (!gridOrders) continue;

      if (!gridOrders.sellOrderId) {
        await this.placeSellOrder(i, gridPrice);
      } else {
        await this.checkSellOrderCompletion(i, gridPrice);
      }
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
        triggerAbove: false,
        isBuy: true,
        amount: tokenAmount,
        poolId: this.config.poolId,
      });

      const gridOrders = this.config.gridOrders.get(gridLevel);
      if (gridOrders) {
        gridOrders.buyOrderId = order.id;
      }

      logger.success(
        `📊 Grid ${gridLevel}: BUY order placed at ${gridPrice.toFixed(
          12
        )} ADA (amount: ${tokenAmount.toLocaleString()} tokens)`,
        this.config.name,
        "order"
      );
    } catch (error) {
      logger.error(
        `Failed to place buy order at grid ${gridLevel}: ${
          (error as Error).message
        }`,
        this.config.name,
        "order"
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
        triggerAbove: true,
        isBuy: false,
        amount: tokenAmount,
        poolId: this.config.poolId,
      });

      const gridOrders = this.config.gridOrders.get(gridLevel);
      if (gridOrders) {
        gridOrders.sellOrderId = order.id;
      }

      logger.success(
        `📊 Grid ${gridLevel}: SELL order placed at ${gridPrice.toFixed(
          12
        )} ADA (amount: ${tokenAmount.toLocaleString()} tokens)`,
        this.config.name,
        "order"
      );
    } catch (error) {
      logger.error(
        `Failed to place sell order at grid ${gridLevel}: ${
          (error as Error).message
        }`,
        this.config.name,
        "order"
      );
    }
  }

  private async checkBuyOrderCompletion(
    gridLevel: number,
    gridPrice: number
  ): Promise<void> {
    const gridOrders = this.config.gridOrders.get(gridLevel);
    if (!gridOrders?.buyOrderId) return;

    const buyOrder = await TradeOrder.findByPk(gridOrders.buyOrderId);

    if (buyOrder && buyOrder.status === "completed") {
      logger.success(
        `✅ Grid ${gridLevel}: BUY completed at ${gridPrice.toFixed(12)} ADA`,
        this.config.name,
        "order"
      );

      gridOrders.buyOrderId = undefined;

      if (gridLevel + 1 < this.gridLevels) {
        await this.placeSellOrder(
          gridLevel + 1,
          this.gridPrices[gridLevel + 1]
        );
      }
    }
  }

  private async checkSellOrderCompletion(
    gridLevel: number,
    gridPrice: number
  ): Promise<void> {
    const gridOrders = this.config.gridOrders.get(gridLevel);
    if (!gridOrders?.sellOrderId) return;

    const sellOrder = await TradeOrder.findByPk(gridOrders.sellOrderId);

    if (sellOrder && sellOrder.status === "completed") {
      logger.success(
        `✅ Grid ${gridLevel}: SELL completed at ${gridPrice.toFixed(12)} ADA`,
        this.config.name,
        "order"
      );

      const profit =
        this.gridSpacing * (this.config.investmentPerGrid / gridPrice);
      this.config.profitPerGrid = profit;
      this.config.totalProfit += profit;

      logger.success(
        `💰 Grid ${gridLevel}: Profit +${profit.toFixed(
          8
        )} ADA (Total: ${this.config.totalProfit.toFixed(8)} ADA)`,
        this.config.name,
        "order"
      );

      gridOrders.sellOrderId = undefined;

      if (gridLevel - 1 >= 0) {
        await this.placeBuyOrder(gridLevel - 1, this.gridPrices[gridLevel - 1]);
      }

      if (this.config.executeOnce) {
        this.config.isActive = false;
        logger.warning(
          `⏸️ Strategy stopped after completing one grid cycle`,
          this.config.name,
          "strategy"
        );
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
      gridSpacing: this.gridSpacing.toFixed(12),
      investmentPerGrid: this.config.investmentPerGrid,
      activeOrders,
      totalProfit: this.config.totalProfit.toFixed(8),
      profitPerGrid: this.config.profitPerGrid.toFixed(8),
      isActive: this.config.isActive,
      executeOnce: this.config.executeOnce,
      currentPrice: this.config.lastProcessedPrice?.toFixed(12) || "N/A",
    };
  }

  private async getCurrentPrice(): Promise<number | null> {
    return await PriceUtil.calculateTokenPrice(
      this.config.poolId,
      this.config.baseToken
    );
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

    const minSpacing = this.config.lowerPrice * 0.001;
    if (this.gridSpacing < minSpacing) {
      logger.warning(
        `⚠️ Grid spacing (${this.gridSpacing.toFixed(
          12
        )} ADA) is very small. Consider fewer levels or wider range.`,
        this.config.name,
        "strategy"
      );
    }

    return true;
  }
}
