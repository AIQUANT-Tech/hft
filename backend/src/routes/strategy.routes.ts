// src/routes/strategy.routes.ts

import { Router } from "express";
import { strategyManager } from "../services/strategyManager.service.js";
import { PoolToken } from "../models/token.model.js";
import { BlockfrostAdapter, NetworkId, Asset } from "@minswap/sdk";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import environment from "../config/environment.js";
import { randomUUID } from "crypto";
import Big from "big.js";
import { TradeOrder } from "../models/tradeOrder.model.js";

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

// src/routes/strategy.routes.ts

// In the /live endpoint, add orderCreated tracking:

router.get("/live", async (req, res) => {
  try {
    const strategies = strategyManager.getAllStrategies();
    const enrichedStrategies = [];

    for (const s of strategies) {
      const status = s.status as any;

      try {
        const strategy = strategyManager.getStrategy(s.id);
        if (!strategy) continue;

        const config = (strategy as any).config;
        const policyId = config.baseToken?.split(".")[0];

        if (!policyId) {
          enrichedStrategies.push({
            id: s.id,
            name: status.name || "Unknown",
            tradingPair: status.tradingPair || "N/A",
            error: "Invalid token configuration",
          });
          continue;
        }

        const poolToken = await PoolToken.findOne({
          where: { policyId },
        });

        if (!poolToken) {
          enrichedStrategies.push({
            id: s.id,
            name: status.name || "Unknown",
            tradingPair: status.tradingPair || "N/A",
            error: `Pool not found for ${policyId}`,
          });
          continue;
        }

        const assetAStr = poolToken.get("assetA") as string;
        const assetBStr = poolToken.get("assetB") as string;

        const assetA: Asset =
          assetAStr === "lovelace" || assetAStr === ""
            ? { policyId: "", tokenName: "" }
            : assetAStr.length >= 56
            ? {
                policyId: assetAStr.slice(0, 56),
                tokenName: assetAStr.slice(56),
              }
            : { policyId: "", tokenName: "" };

        const assetB: Asset =
          assetBStr === "lovelace" || assetBStr === ""
            ? { policyId: "", tokenName: "" }
            : assetBStr.length >= 56
            ? {
                policyId: assetBStr.slice(0, 56),
                tokenName: assetBStr.slice(56),
              }
            : { policyId: "", tokenName: "" };

        const pool = await blockfrostAdapter.getV2PoolByPair(assetA, assetB);

        if (!pool) {
          enrichedStrategies.push({
            id: s.id,
            name: status.name || "Unknown",
            tradingPair: status.tradingPair || "N/A",
            error: "Pool not found on DEX",
          });
          continue;
        }

        const [priceA, priceB] = await blockfrostAdapter.getV2PoolPrice({
          pool,
        });

        const isAAda = assetAStr === "lovelace" || assetAStr === "";
        const isBAda = assetBStr === "lovelace" || assetBStr === "";

        let currentPrice = 0;

        if (isAAda && !isBAda) {
          currentPrice = Number(
            Big(priceB.toString()).div(1_000_000).toString()
          );
        } else if (isBAda && !isAAda) {
          currentPrice = Number(
            Big(priceA.toString()).div(1_000_000).toString()
          );
        }

        const targetPrice = status.targetPrice || 0;
        const priceDiff = currentPrice - targetPrice;
        const priceDiffPct =
          targetPrice > 0 ? (priceDiff / targetPrice) * 100 : 0;

        const conditionMet =
          status.triggerType === "ABOVE"
            ? currentPrice > targetPrice
            : currentPrice < targetPrice;

        // ✅ Check if order was created for this strategy
        const hasOrder = await TradeOrder.findOne({
          where: {
            tradingPair: status.tradingPair,
            walletAddress: config.walletAddress,
            status: ["pending", "executing", "completed"],
          },
        });

        enrichedStrategies.push({
          id: s.id,
          name: status.name,
          tradingPair: status.tradingPair,
          side: status.side,
          triggerType: status.triggerType,
          orderAmount: status.orderAmount,
          isActive: status.isActive,
          currentPrice: currentPrice.toFixed(6),
          targetPrice: targetPrice.toFixed(6),
          priceDifference: priceDiff.toFixed(6),
          priceDifferencePercent: priceDiffPct.toFixed(2),
          distanceToTarget: Math.abs(priceDiff).toFixed(6),
          conditionMet: conditionMet,
          orderCreated: !!hasOrder, // ✅ Add this field
          status: conditionMet ? "READY" : "WAITING",
          lastUpdate: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`Error enriching strategy ${s.id}:`, err);
        enrichedStrategies.push({
          id: s.id,
          name: status.name || "Unknown",
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

// Start/Resume strategy
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

// DELETE /api/strategy/:id
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
