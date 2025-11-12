// src/routes/orders.routes.ts (create new file)

import { Router } from "express";
import { TradeOrder } from "../models/tradeOrder.model.js";

const router = Router();

// GET /api/orders - Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await TradeOrder.findAll({
      order: [["createdAt", "DESC"]],
    });

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

// GET /api/orders/:id - Get single order
router.get("/:id", async (req, res) => {
  try {
    const order = await TradeOrder.findByPk(req.params.id);

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

// DELETE /api/orders/:id - Delete order
router.delete("/:id", async (req, res) => {
  try {
    const order = await TradeOrder.findByPk(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        error: "Order not found",
      });
      return;
    }

    // Only allow deletion of pending or failed orders
    if (order.status !== "pending" && order.status !== "failed") {
      res.status(400).json({
        success: false,
        error: `Cannot delete ${order.status} orders`,
      });
      return;
    }

    await order.destroy();

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
