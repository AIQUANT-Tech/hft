// src/index.ts

import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
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
import { strategyManager } from "./services/strategyManager.service.js";
import { databaseService } from "./services/database.service.js";
import { syncAllPools } from "./jobs/syncPoolsJob.js";
import { tradingBotService } from "./services/tradingBot.service.js";
import { TradeOrder } from "./models/tradeOrder.model.js";

dotenv.config();

(async () => {
  const app: Application = express();
  const PORT = process.env.PORT || 8080;

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  await sequelize.authenticate();
  // Sync both models
  await PoolToken.sync();
  await TradeOrder.sync();
  console.log("✅ Database connection OK");

  // await PoolToken.sync();
  // await databaseService.initialize();

  // setTimeout(() => syncAllPools(), 2000);
  // setInterval(() => syncAllPools(), 2 * 60 * 60 * 1000);

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use("/api/tokens", tokensRouter);
  app.use("/api/aggregator", aggregatorRoutes);
  app.use("/api/price-history", priceHistoryRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use("/api/bot", tradingBotRoutes);
  app.use("/api/strategy", strategyRoutes);

  await strategyManager.start();
  await tradingBotService.start();

  io.on("connection", (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // ✅ FIX: Use database instead of tokenService
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
                // ✅ FIXED: Query database directly (NO pool scanning)
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
                        currentPriceFormatted: `${currentPrice.toFixed(6)} ADA`,
                        targetPrice: targetPrice,
                        targetPriceFormatted: `${targetPrice.toFixed(6)} ADA`,
                        priceDifference: priceDiff,
                        priceDifferenceFormatted: `${
                          priceDiff > 0 ? "+" : ""
                        }${priceDiff.toFixed(6)} (${
                          priceDiff > 0 ? "+" : ""
                        }${priceDiffPct.toFixed(2)}%)`,
                        distanceToTarget: Math.abs(priceDiff),
                        distanceToTargetFormatted: `${Math.abs(
                          priceDiff
                        ).toFixed(6)} ADA (${Math.abs(priceDiffPct).toFixed(
                          2
                        )}%)`,
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
