// src/routes/dashboard.routes.ts

import { Router } from "express";
import { dashboardController } from "../controller/dashboard.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// GET /api/dashboard - Get all dashboard data
router.get("/", dashboardController.getDashboard.bind(dashboardController));

// GET /api/dashboard/portfolio - Get portfolio stats
router.get(
  "/portfolio",
  dashboardController.getPortfolio.bind(dashboardController)
);

// GET /api/dashboard/holdings - Get holdings
router.get(
  "/holdings",
  dashboardController.getHoldings.bind(dashboardController)
);

// GET /api/dashboard/strategies - Get active strategies
router.get(
  "/strategies",
  dashboardController.getStrategies.bind(dashboardController)
);

// GET /api/dashboard/history?days=30 - Get portfolio history
router.get(
  "/history",
  dashboardController.getHistory.bind(dashboardController)
);

// GET /api/dashboard/breakdown - Get strategy breakdown
router.get(
  "/breakdown",
  dashboardController.getBreakdown.bind(dashboardController)
);

// POST /api/dashboard/refresh - Refresh dashboard data
router.post(
  "/refresh",
  dashboardController.refreshDashboard.bind(dashboardController)
);

export default router;
