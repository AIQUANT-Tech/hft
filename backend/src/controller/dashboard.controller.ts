// // src/controllers/dashboard.controller.ts

// import { Request, Response } from "express";
// import { dashboardService } from "../services/dashboard.service.js";
// import { logger } from "../services/logger.service.js";
// import { CardanoService } from "../services/cardano.service.js";

// interface AuthenticatedRequest extends Request {
//   user?: {
//     userId: number;
//     walletAddress: string;
//   };
// }
// export class DashboardController {
//   // GET /api/dashboard
//   async getDashboard(req: AuthenticatedRequest, res: Response) {
//     try {
//       const walletAddress = req.user?.walletAddress;

//       if (!walletAddress) {
//         return res.status(401).json({
//           success: false,
//           error: "Wallet address not found",
//         });
//       }

//       const data = await dashboardService.getDashboardData(walletAddress);

//       res.json({
//         success: true,
//         data,
//       });
//     } catch (error: any) {
//       logger.error(`Dashboard fetch error: ${error.message}`, undefined, "api");
//       res.status(500).json({
//         success: false,
//         error: "Failed to fetch dashboard data",
//       });
//     }
//   }

//   // GET /api/dashboard/portfolio
//   async getPortfolio(req: AuthenticatedRequest, res: Response) {
//     try {
//       const walletAddress = req.user?.walletAddress;

//       if (!walletAddress) {
//         return res.status(401).json({
//           success: false,
//           error: "Wallet address not found",
//         });
//       }

//       const portfolio = await dashboardService.getPortfolioStats(walletAddress);

//       res.json({
//         success: true,
//         data: portfolio,
//       });
//     } catch (error: any) {
//       logger.error(`Portfolio fetch error: ${error.message}`, undefined, "api");
//       res.status(500).json({
//         success: false,
//         error: "Failed to fetch portfolio",
//       });
//     }
//   }

//   // GET /api/dashboard/holdings
//   async getHoldings(req: AuthenticatedRequest, res: Response) {
//     try {
//       const walletAddress = req.user?.walletAddress;

//       if (!walletAddress) {
//         return res.status(401).json({
//           success: false,
//           error: "Wallet address not found",
//         });
//       }

//       const holdings = await dashboardService.getHoldings(walletAddress);

//       res.json({
//         success: true,
//         data: holdings,
//       });
//     } catch (error: any) {
//       logger.error(`Holdings fetch error: ${error.message}`, undefined, "api");
//       res.status(500).json({
//         success: false,
//         error: "Failed to fetch holdings",
//       });
//     }
//   }

//   // GET /api/dashboard/strategies
//   async getStrategies(req: AuthenticatedRequest, res: Response) {
//     try {
//       const walletAddress = req.user?.walletAddress;

//       if (!walletAddress) {
//         return res.status(401).json({
//           success: false,
//           error: "Wallet address not found",
//         });
//       }

//       const strategies = await dashboardService.getActiveStrategies(
//         walletAddress
//       );

//       res.json({
//         success: true,
//         data: strategies,
//       });
//     } catch (error: any) {
//       logger.error(
//         `Strategies fetch error: ${error.message}`,
//         undefined,
//         "api"
//       );
//       res.status(500).json({
//         success: false,
//         error: "Failed to fetch strategies",
//       });
//     }
//   }

//   // GET /api/dashboard/history
//   async getHistory(req: AuthenticatedRequest, res: Response) {
//     try {
//       const walletAddress = req.user?.walletAddress;
//       const days = parseInt(req.query.days as string) || 30;

//       if (!walletAddress) {
//         return res.status(401).json({
//           success: false,
//           error: "Wallet address not found",
//         });
//       }

//       const history = await dashboardService.getPortfolioHistory(
//         walletAddress,
//         days
//       );

//       res.json({
//         success: true,
//         data: history,
//       });
//     } catch (error: any) {
//       logger.error(`History fetch error: ${error.message}`, undefined, "api");
//       res.status(500).json({
//         success: false,
//         error: "Failed to fetch history",
//       });
//     }
//   }

//   // GET /api/dashboard/breakdown
//   async getBreakdown(req: AuthenticatedRequest, res: Response) {
//     try {
//       const walletAddress = req.user?.walletAddress;

//       if (!walletAddress) {
//         return res.status(401).json({
//           success: false,
//           error: "Wallet address not found",
//         });
//       }

//       const breakdown = await dashboardService.getStrategyBreakdown(
//         walletAddress
//       );

//       res.json({
//         success: true,
//         data: breakdown,
//       });
//     } catch (error: any) {
//       logger.error(`Breakdown fetch error: ${error.message}`, undefined, "api");
//       res.status(500).json({
//         success: false,
//         error: "Failed to fetch breakdown",
//       });
//     }
//   }

//   // POST /api/dashboard/refresh
//   async refreshDashboard(req: AuthenticatedRequest, res: Response) {
//     try {
//       const ownerAddress = req.user?.walletAddress;

//       if (!ownerAddress) {
//         return res.status(401).json({
//           success: false,
//           error: "Wallet address not found",
//         });
//       }

//       // Get all backend wallets for this owner
//       const userWallets: string[] = await CardanoService.getWalletsByOwner(
//         ownerAddress
//       );

//       // Update portfolio stats for each wallet
//       await Promise.all(
//         userWallets.map(async (walletAddress) => {
//           await dashboardService.updatePortfolioStats(walletAddress);
//         })
//       );

//       res.json({
//         success: true,
//         message: "Dashboard refreshed successfully",
//       });
//     } catch (error: any) {
//       logger.error(
//         `Dashboard refresh error: ${error.message}`,
//         undefined,
//         "api"
//       );
//       res.status(500).json({
//         success: false,
//         error: "Failed to refresh dashboard",
//       });
//     }
//   }
// }

// export const dashboardController = new DashboardController();

// src/controllers/dashboard.controller.ts
import { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service.js";
import { logger } from "../services/logger.service.js";
import { CardanoService } from "../services/cardano.service.js";

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

      // Normalize rows: ensure date is YYYY-MM-DD string and numeric strings are preserved
      const normalized = history.map((row: any) => {
        const dateVal =
          row.date instanceof Date
            ? row.date.toISOString().split("T")[0]
            : String(row.date);
        return {
          date: dateVal,
          totalValueAda: String(row.totalValueAda ?? "0"),
          totalValueUsd:
            row.totalValueUsd !== undefined
              ? String(row.totalValueUsd)
              : undefined,
          profitLoss: String(row.profitLoss ?? "0"),
        };
      });

      res.json({
        success: true,
        data: normalized,
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
      const ownerAddress = req.user?.walletAddress;

      if (!ownerAddress) {
        return res.status(401).json({
          success: false,
          error: "Wallet address not found",
        });
      }

      // Get all backend wallets for this owner
      const userWallets: string[] = await CardanoService.getWalletsByOwner(
        ownerAddress
      );

      // Update portfolio stats for each wallet
      await Promise.all(
        userWallets.map(async (walletAddress) => {
          await dashboardService.updatePortfolioStats(walletAddress);
        })
      );

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
