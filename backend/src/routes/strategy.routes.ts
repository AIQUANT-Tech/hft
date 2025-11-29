// src/routes/strategy.routes.ts

import { Router } from "express";
import { strategyManager } from "../services/strategyManager.service.js";
import { PoolToken } from "../models/token.model.js";
import { BlockfrostAdapter, NetworkId, Asset } from "@minswap/sdk";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import environment from "../config/environment.js";
import { randomUUID } from "crypto";
import Big from "big.js";
import { authenticateJWT, AuthRequest } from "../middleware/auth.middleware.js";
import { CardanoService } from "../services/cardano.service.js";
import { ACAConfig } from "../strategies/ACAStrategy.js";
import { logger } from "../services/logger.service.js";
import { PriceUtil } from "../utils/price.util.js";
import { GridConfig } from "../strategies/GridStrategy.js";

const router = Router();

const blockfrostAPI = new BlockFrostAPI({
  projectId: environment.BLOCKFROST.PROJECT_ID,
});
const blockfrostAdapter = new BlockfrostAdapter({
  networkId: NetworkId.TESTNET,
  blockFrost: blockfrostAPI,
});

// POST /api/strategy/price-target
router.post("/price-target", (req, res) => {
  try {
    const {
      name,
      walletAddress,
      tradingPair,
      baseToken,
      quoteToken,
      targetPrice,
      orderAmount,
      side,
      triggerType,
      executeOnce = true,
      poolId,
    } = req.body;

    const id = randomUUID();

    strategyManager.addPriceTargetStrategy({
      id,
      name,
      walletAddress,
      tradingPair,
      baseToken,
      quoteToken,
      isActive: true,
      targetPrice: parseFloat(targetPrice),
      orderAmount: parseFloat(orderAmount),
      side,
      triggerType,
      poolId,
      executeOnce,
    });

    res.status(201).json({
      success: true,
      strategyId: id,
      message: "Strategy created and active",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// POST /api/strategy/ACA strategy endpoint
router.post("/aca", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      walletAddress,
      tradingPair,
      baseToken,
      quoteToken,
      investmentAmount,
      intervalMinutes,
      totalRuns,
      executeOnce,
      poolId,
    } = req.body;

    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Verify wallet ownership
    const isOwner = await CardanoService.verifyWalletOwnership(
      walletAddress,
      userAddress
    );

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to use this wallet",
      });
    }

    const strategyId = `aca-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    const config: ACAConfig = {
      id: strategyId,
      name,
      walletAddress,
      tradingPair,
      baseToken,
      quoteToken,
      investmentAmount,
      intervalMinutes,
      totalRuns,
      executeOnce,
      isActive: true,
      runsExecuted: 0,
      poolId,
    };

    strategyManager.addACAStrategy(config);

    logger.success(`ACA strategy created: ${name}`, name, "strategy");

    res.json({
      success: true,
      strategyId,
      message: "ACA strategy created successfully",
    });
  } catch (error: any) {
    logger.error(
      `Failed to create ACA strategy: ${error.message}`,
      undefined,
      "strategy"
    );
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/strategy/grid strategy endpoint
router.post("/grid", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      walletAddress,
      tradingPair,
      baseToken,
      quoteToken,
      poolId,
      lowerPrice,
      upperPrice,
      gridLevels,
      investmentPerGrid,
      executeOnce,
    } = req.body;

    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const isOwner = await CardanoService.verifyWalletOwnership(
      walletAddress,
      userAddress
    );

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to use this wallet",
      });
    }

    const strategyId = `grid-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    const config: GridConfig = {
      id: strategyId,
      name,
      walletAddress,
      tradingPair,
      baseToken,
      quoteToken,
      poolId,
      lowerPrice,
      upperPrice,
      gridLevels,
      investmentPerGrid,
      executeOnce,
      isActive: true,
      gridOrders: new Map(),
      profitPerGrid: 0,
      totalProfit: 0,
    };

    strategyManager.addGridStrategy(config);

    logger.success(`Grid strategy created: ${name}`, name, "strategy");

    res.json({
      success: true,
      strategyId,
      message: "Grid strategy created successfully",
    });
  } catch (error: any) {
    logger.error(
      `Failed to create Grid strategy: ${error.message}`,
      undefined,
      "strategy"
    );
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ============================================================
   STOP LOSS / TAKE PROFIT STRATEGY
============================================================ */
router.post("/sltp", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      walletAddress,
      tradingPair,
      baseToken,
      quoteToken,
      entryPrice,
      stopLossPercent,
      takeProfitPercent,
      amount,
      poolId,
    } = req.body;

    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // verify wallet ownership
    const isOwner = await CardanoService.verifyWalletOwnership(
      walletAddress,
      userAddress
    );

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to use this wallet",
      });
    }

    const strategyId = `sltp-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    strategyManager.addStopLossTakeProfitStrategy({
      id: strategyId,
      name,
      walletAddress,
      tradingPair,
      baseToken,
      quoteToken,
      poolId,
      isActive: true,
      entryPrice,
      stopLossPercent,
      takeProfitPercent,
      amount,
    });

    logger.success(`SLTP Strategy Created: ${name}`, name, "strategy");

    res.json({
      success: true,
      strategyId,
      message: "StopLoss/TakeProfit strategy created successfully",
    });
  } catch (error: any) {
    logger.error(
      `Failed to create SLTP strategy: ${error.message}`,
      undefined,
      "strategy"
    );
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/strategy/live - Get live strategies with enriched data
// src/routes/strategy.routes.ts

router.get("/live", async (req, res) => {
  try {
    const strategies = strategyManager.getAllStrategies();
    console.log("strategies: ", strategies);

    const enrichedStrategies = [];

    for (const s of strategies) {
      try {
        const strategy = strategyManager.getStrategy(s.id);
        if (!strategy) continue;

        const status = s.status as any;

        // ✅ Handle Price Target Strategy
        if (status.strategy === "PriceTarget") {
          enrichedStrategies.push({
            id: s.id,
            strategy: "PriceTarget",
            name: status.name,
            tradingPair: status.tradingPair,
            side: status.side,
            triggerType: status.triggerType,
            orderAmount: status.orderAmount,
            isActive: status.isActive,
            currentPrice: status.currentPrice || 0,
            targetPrice: status.targetPrice || 0,
            priceDifference: status.priceDifference || 0,
            priceDifferencePercent: status.priceDifferencePercent || 0,
            distanceToTarget: Math.abs(status.priceDifference || 0),
            conditionMet: status.conditionMet || false,
            orderCreated: status.orderCreated || false,
            lastUpdate: new Date().toISOString(),
          });
        }
        // ✅ Handle ACA Strategy
        else if (status.type === "ACA") {
          enrichedStrategies.push({
            id: s.id,
            type: "ACA",
            name: status.name,
            tradingPair: status.tradingPair,
            isActive: status.isActive,
            investmentAmount: status.investmentAmount,
            intervalMinutes: status.intervalMinutes,
            runsExecuted: status.runsExecuted,
            totalRuns: status.totalRuns,
            lastBuyTime: status.lastBuyTime,
            nextBuyTime: status.nextBuyTime,
            timeUntilNextBuy: status.timeUntilNextBuy,
            progress: status.progress,
            executeOnce: status.executeOnce,
            lastUpdate: new Date().toISOString(),
          });
        }
        // ✅ Handle Grid Strategy
        else if (status.type === "Grid Trading") {
          enrichedStrategies.push({
            id: s.id,
            type: "Grid Trading",
            name: status.name,
            tradingPair: status.tradingPair,
            isActive: status.isActive,
            lowerPrice: status.lowerPrice,
            upperPrice: status.upperPrice,
            gridLevels: status.gridLevels,
            gridSpacing: status.gridSpacing,
            investmentPerGrid: status.investmentPerGrid,
            activeOrders: status.activeOrders,
            totalProfit: status.totalProfit,
            profitPerGrid: status.profitPerGrid,
            executeOnce: status.executeOnce,
            lastUpdate: new Date().toISOString(),
          });
        } else if (status.strategy === "sltp") {
          enrichedStrategies.push({
            id: s.id,
            type: "sltp",
            name: status.name,
            tradingPair: status.tradingPair,
            entryPrice: status.entryPrice,
            stopLossPercent: status.stopLossPercent,
            takeProfitPercent: status.takeProfitPercent,
            stopLossPrice: status.stopLossPrice,
            takeProfitPrice: status.takeProfitPrice,
            currentPrice: status.currentPrice,
            isActive: status.isActive,
            amount: status.amount,
            conditionTriggered: status.conditionTriggered,
            lastUpdate: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`Error enriching strategy ${s.id}:`, err);
        enrichedStrategies.push({
          id: s.id,
          name: "Unknown",
          error: (err as Error).message,
        });
      }
    }

    res.json({
      success: true,
      count: enrichedStrategies.length,
      strategies: enrichedStrategies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// POST /api/strategy/stop/:id - Stop strategy
router.post("/stop/:id", (req, res) => {
  try {
    const { id } = req.params;
    const strategy = strategyManager.getStrategy(id);

    if (!strategy) {
      res.status(404).json({ error: "Strategy not found" });
      return;
    }

    strategy.config.isActive = false;

    res.json({
      success: true,
      message: `Strategy ${id} stopped`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/strategy/start/:id - Start strategy
router.post("/start/:id", (req, res) => {
  try {
    const { id } = req.params;
    const strategy = strategyManager.getStrategy(id);

    if (!strategy) {
      res.status(404).json({ error: "Strategy not found" });
      return;
    }

    strategy.config.isActive = true;

    res.json({
      success: true,
      message: `Strategy ${id} started`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/strategy/:id - Remove strategy
router.delete("/:id", (req, res) => {
  try {
    const removed = strategyManager.removeStrategy(req.params.id);

    if (!removed) {
      res.status(404).json({
        success: false,
        error: "Strategy not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Strategy removed",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
