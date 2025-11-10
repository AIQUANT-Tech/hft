// src/routes/tradingBot.routes.ts

import { Router } from "express";
import { tradingBotService } from "../services/tradingBot.service.js";

const router = Router();

// POST /api/bot/orders - Create new trade order
router.post("/orders", async (req, res) => {
  try {
    const {
      walletAddress,
      tradingPair,
      baseToken,
      quoteToken = "ADA",
      targetPrice,
      triggerAbove,
      isBuy,
      amount,
    } = req.body;

    if (
      !walletAddress ||
      !tradingPair ||
      !baseToken ||
      !targetPrice ||
      amount === undefined
    ) {
      res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
      return;
    }

    const order = await tradingBotService.createOrder({
      walletAddress,
      tradingPair,
      baseToken,
      quoteToken,
      targetPrice: parseFloat(targetPrice),
      triggerAbove: triggerAbove === true,
      isBuy: isBuy === true,
      amount: parseFloat(amount),
    });

    res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// GET /api/bot/orders - Get all orders (optionally filter by wallet)
router.get("/orders", async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress as string | undefined;
    const orders = await tradingBotService.getOrders(walletAddress);

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// GET /api/bot/orders/:id - Get order by ID
router.get("/orders/:id", async (req, res) => {
  try {
    const order = await tradingBotService.getOrderById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        error: "Order not found",
      });
      return;
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// DELETE /api/bot/orders/:id - Cancel order
router.delete("/orders/:id", async (req, res) => {
  try {
    const order = await tradingBotService.cancelOrder(req.params.id);

    res.json({
      success: true,
      message: "Order cancelled",
      order,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// POST /api/bot/start - Start bot
router.post("/start", async (req, res) => {
  try {
    await tradingBotService.start();
    res.json({
      success: true,
      message: "Trading bot started",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// POST /api/bot/stop - Stop bot
router.post("/stop", (req, res) => {
  try {
    tradingBotService.stop();
    res.json({
      success: true,
      message: "Trading bot stopped",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
