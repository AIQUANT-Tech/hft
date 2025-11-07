import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import tokensRouter from "./routes/tokens.routes.js";
import sequelize from "./config/db.js";
import { PoolToken } from "./models/token.model.js";
import { databaseService } from "./services/databaseService.js";
import { syncAllPools } from "./jobs/syncPoolsJob.js";
import aggregatorRoutes from "./routes/aggregator.routes.js";
import priceHistoryRoutes from "./routes/priceHistory.routes.js";
// import swapRouter from "./routes/swap.routes";

dotenv.config();

(async () => {
  const app: Application = express();
  const PORT = process.env.PORT || 8080;

  await sequelize.authenticate();
  console.log("✅ Database connection OK");

  // Sync Model
  await PoolToken.sync();

  // Initialize database
  await databaseService.initialize();

  // // Sync pools on startup
  // setTimeout(() => syncAllPools(), 2000);

  // // Schedule periodic sync every 2 hours
  // setInterval(() => syncAllPools(), 2 * 60 * 60 * 1000);

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use("/api/tokens", tokensRouter);
  app.use("/api/aggregator", aggregatorRoutes);
  app.use("/api/price-history", priceHistoryRoutes);
  // app.use("/api/swap", swapRouter);

  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  });
})();
