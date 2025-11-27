// src/index.ts

import express, { Application } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import tokensRouter from "./routes/tokens.routes.js";
import sequelize from "./config/db.js";
import { PoolToken } from "./models/token.model.js";
import aggregatorRoutes from "./routes/aggregator.routes.js";
import priceHistoryRoutes from "./routes/priceHistory.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import tradingBotRoutes from "./routes/tradingBot.routes.js";
import strategyRoutes from "./routes/strategy.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import { strategyManager } from "./services/strategyManager.service.js";
import { databaseService } from "./services/database.service.js";
import { syncAllPools } from "./jobs/syncPoolsJob.js";
import { tradingBotService } from "./services/tradingBot.service.js";
import { TradeOrder } from "./models/tradeOrder.model.js";
import environment from "./config/environment.js";
import User from "./models/user.model.js";
import cookieParser from "cookie-parser";
import { logger } from "./services/logger.service.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
// src/models/index.ts

import { Portfolio } from "./models/portfolio.model.js";
import Strategy from "./models/strategy.model.js";
import { PortfolioHistory } from "./models/portfolioHistory.model.js";
import dotenv from "dotenv";
dotenv.config();

(async () => {
  const app: Application = express();
  const PORT = environment.PORT || 8080;

  const httpServer = createServer(app);

  // FIX: Proper Socket.IO CORS configuration
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL!,
        process.env.FRONTEND_URL_2!,
        process.env.FRONTEND_URL_3!,
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Add these options to prevent reconnection loops
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    transports: ["websocket", "polling"], // Prefer websocket
  });

  // ✅ Initialize logger with WebSocket
  logger.setSocketIO(io);
  // Sync All Models
  await sequelize.authenticate();
  await PoolToken.sync();
  await TradeOrder.sync();
  await User.sync();
  await Portfolio.sync();
  await Strategy.sync();
  await PortfolioHistory.sync();
  console.log("✅ Database connection OK");

  // await databaseService.initialize();
  // setTimeout(() => syncAllPools(), 2000);
  // setInterval(() => syncAllPools(), 2 * 60 * 60 * 1000);

  app.use(cookieParser());

  app.use(
    cors({
      origin: [
        process.env.FRONTEND_URL!,
        process.env.FRONTEND_URL_2!,

        process.env.FRONTEND_URL_3!,
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json());

  // Routes
  app.get("/api", (req, res) => {
    res.json({
      success: true,
      message: "API is running for ADA Velocity 🚀",
    });
  });
  app.use("/api/tokens", tokensRouter);
  app.use("/api/aggregator", aggregatorRoutes);
  app.use("/api/price-history", priceHistoryRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use("/api/bot", tradingBotRoutes);
  app.use("/api/strategy", strategyRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  await strategyManager.start();
  await tradingBotService.start();

  // FIX: Better socket connection handling
  io.on("connection", (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Send log history immediately on connect
    socket.emit("log:history", logger.getHistory());

    socket.on("disconnect", (reason) => {
      console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Broadcast strategies update
  setInterval(async () => {
    try {
      const strategies = strategyManager.getAllStrategies();

      const enrichedStrategies = await Promise.all(
        strategies.map(async (s) => {
          const status = s.status as any;

          try {
            const strategy = strategyManager.getStrategy(s.id);
            if (strategy) {
              const config = (strategy as any).config;
              const policyId = config.baseToken?.split(".")[0];

              if (policyId) {
                const poolToken = await PoolToken.findOne({
                  where: { policyId },
                });

                if (poolToken) {
                  const currentPrice = parseFloat(
                    poolToken.get("priceAda") as string
                  );
                  const targetPrice = parseFloat(
                    status.targetPrice?.toString().replace(/[^0-9.]/g, "") ||
                      "0"
                  );

                  if (targetPrice > 0) {
                    const priceDiff = currentPrice - targetPrice;
                    const priceDiffPct = (priceDiff / targetPrice) * 100;
                    const conditionMet =
                      status.triggerType === "ABOVE"
                        ? currentPrice > targetPrice
                        : currentPrice < targetPrice;

                    return {
                      id: s.id,
                      status: {
                        ...status,
                        currentPrice: currentPrice,
                        currentPriceFormatted: `${currentPrice} ADA`,
                        targetPrice: targetPrice,
                        targetPriceFormatted: `${targetPrice} ADA`,
                        priceDifference: priceDiff,
                        priceDifferenceFormatted: `${
                          priceDiff > 0 ? "+" : ""
                        }${priceDiff} (${
                          priceDiff > 0 ? "+" : ""
                        }${priceDiffPct}%)`,
                        distanceToTarget: Math.abs(priceDiff),
                        distanceToTargetFormatted: `${Math.abs(
                          priceDiff
                        )} ADA (${Math.abs(priceDiffPct)}%)`,
                        conditionMet: conditionMet,
                        conditionMetFormatted: conditionMet
                          ? "✅ YES"
                          : "❌ NO",
                        lastUpdate: new Date().toISOString(),
                      },
                    };
                  }
                }
              }
            }
          } catch (err) {
            console.error("Error enriching strategy:", err);
          }

          return { id: s.id, status };
        })
      );

      io.emit("strategies:update", {
        timestamp: new Date().toISOString(),
        strategies: enrichedStrategies,
        managerStatus: strategyManager.getStatus(),
      });
    } catch (error) {
      console.error("Error broadcasting strategies:", error);
    }
  }, 5000);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server ready`);
    console.log(`💡 Note: Make sure to sync MIN pool data first`);
  });
})();
