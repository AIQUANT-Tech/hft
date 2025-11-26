// src/controllers/dashboard.controller.ts

import { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service.js";
import { logger } from "../services/logger.service.js";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    walletAddress: string;
  };
}
export class DashboardController {
  // GET /api/dashboard
  async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const walletAddress = req.user?.walletAddress;

      if (!walletAddress) {
        return res.status(401).json({
          success: false,
          error: "Wallet address not found",
        });
      }

      const data = await dashboardService.getDashboardData(walletAddress);

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      logger.error(`Dashboard fetch error: ${error.message}`, undefined, "api");
      res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard data",
      });
    }
  }

  // GET /api/dashboard/portfolio
  async getPortfolio(req: AuthenticatedRequest, res: Response) {
    try {
      const walletAddress = req.user?.walletAddress;

      if (!walletAddress) {
        return res.status(401).json({
          success: false,
          error: "Wallet address not found",
        });
      }

      const portfolio = await dashboardService.getPortfolioStats(walletAddress);

      res.json({
        success: true,
        data: portfolio,
      });
    } catch (error: any) {
      logger.error(`Portfolio fetch error: ${error.message}`, undefined, "api");
      res.status(500).json({
        success: false,
        error: "Failed to fetch portfolio",
      });
    }
  }

  // GET /api/dashboard/holdings
  async getHoldings(req: AuthenticatedRequest, res: Response) {
    try {
      const walletAddress = req.user?.walletAddress;

      if (!walletAddress) {
        return res.status(401).json({
          success: false,
          error: "Wallet address not found",
        });
      }

      const holdings = await dashboardService.getHoldings(walletAddress);

      res.json({
        success: true,
        data: holdings,
      });
    } catch (error: any) {
      logger.error(`Holdings fetch error: ${error.message}`, undefined, "api");
      res.status(500).json({
        success: false,
        error: "Failed to fetch holdings",
      });
    }
  }

  // GET /api/dashboard/strategies
  async getStrategies(req: AuthenticatedRequest, res: Response) {
    try {
      const walletAddress = req.user?.walletAddress;

      if (!walletAddress) {
        return res.status(401).json({
          success: false,
          error: "Wallet address not found",
        });
      }

      const strategies = await dashboardService.getActiveStrategies(
        walletAddress
      );

      res.json({
        success: true,
        data: strategies,
      });
    } catch (error: any) {
      logger.error(
        `Strategies fetch error: ${error.message}`,
        undefined,
        "api"
      );
      res.status(500).json({
        success: false,
        error: "Failed to fetch strategies",
      });
    }
  }

  // GET /api/dashboard/activities
  async getActivities(req: AuthenticatedRequest, res: Response) {
    try {
      const walletAddress = req.user?.walletAddress;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!walletAddress) {
        return res.status(401).json({
          success: false,
          error: "Wallet address not found",
        });
      }

      const activities = await dashboardService.getRecentActivities(
        walletAddress,
        limit
      );

      res.json({
        success: true,
        data: activities,
      });
    } catch (error: any) {
      logger.error(
        `Activities fetch error: ${error.message}`,
        undefined,
        "api"
      );
      res.status(500).json({
        success: false,
        error: "Failed to fetch activities",
      });
    }
  }

  // GET /api/dashboard/history
  async getHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const walletAddress = req.user?.walletAddress;
      const days = parseInt(req.query.days as string) || 30;

      if (!walletAddress) {
        return res.status(401).json({
          success: false,
          error: "Wallet address not found",
        });
      }

      const history = await dashboardService.getPortfolioHistory(
        walletAddress,
        days
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      logger.error(`History fetch error: ${error.message}`, undefined, "api");
      res.status(500).json({
        success: false,
        error: "Failed to fetch history",
      });
    }
  }

  // GET /api/dashboard/breakdown
  async getBreakdown(req: AuthenticatedRequest, res: Response) {
    try {
      const walletAddress = req.user?.walletAddress;

      if (!walletAddress) {
        return res.status(401).json({
          success: false,
          error: "Wallet address not found",
        });
      }

      const breakdown = await dashboardService.getStrategyBreakdown(
        walletAddress
      );

      res.json({
        success: true,
        data: breakdown,
      });
    } catch (error: any) {
      logger.error(`Breakdown fetch error: ${error.message}`, undefined, "api");
      res.status(500).json({
        success: false,
        error: "Failed to fetch breakdown",
      });
    }
  }

  // POST /api/dashboard/refresh
  async refreshDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const walletAddress = req.user?.walletAddress;

      if (!walletAddress) {
        return res.status(401).json({
          success: false,
          error: "Wallet address not found",
        });
      }

      await dashboardService.updatePortfolioStats(walletAddress);

      res.json({
        success: true,
        message: "Dashboard refreshed successfully",
      });
    } catch (error: any) {
      logger.error(
        `Dashboard refresh error: ${error.message}`,
        undefined,
        "api"
      );
      res.status(500).json({
        success: false,
        error: "Failed to refresh dashboard",
      });
    }
  }
}

export const dashboardController = new DashboardController();
