// src/models/strategy.model.ts

import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.js";

interface StrategyAttributes {
  id: string;
  walletAddress: string;
  name: string;
  type: "grid" | "dca" | "price-target" | "stop-loss-take-profit";
  tradingPair: string;
  baseToken: string;
  quoteToken: string;
  investedAmount: string;
  currentValue: string;
  profitLoss: string;
  profitLossPercent: string;
  isActive: boolean;
  status: "active" | "paused" | "completed" | "failed";
  config: string;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StrategyCreationAttributes
  extends Optional<StrategyAttributes, "id" | "createdAt" | "updatedAt"> {}

class Strategy
  extends Model<StrategyAttributes, StrategyCreationAttributes>
  implements StrategyAttributes
{
  // Use declare instead of public field declarations
  declare id: string;
  declare walletAddress: string;
  declare name: string;
  declare type: "grid" | "dca" | "price-target" | "stop-loss-take-profit";
  declare tradingPair: string;
  declare baseToken: string;
  declare quoteToken: string;
  declare investedAmount: string;
  declare currentValue: string;
  declare profitLoss: string;
  declare profitLossPercent: string;
  declare isActive: boolean;
  declare status: "active" | "paused" | "completed" | "failed";
  declare config: string;
  declare totalTrades: number;
  declare successfulTrades: number;
  declare failedTrades: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Strategy.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    walletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "wallet_address",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        "grid",
        "dca",
        "price-target",
        "stop-loss-take-profit"
      ),
      allowNull: false,
    },
    tradingPair: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "trading_pair",
    },
    baseToken: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "base_token",
    },
    quoteToken: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "quote_token",
    },
    investedAmount: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
      defaultValue: "0",
      field: "invested_amount",
    },
    currentValue: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
      defaultValue: "0",
      field: "current_value",
    },
    profitLoss: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
      defaultValue: "0",
      field: "profit_loss",
    },
    profitLossPercent: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: "0",
      field: "profit_loss_percent",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    status: {
      type: DataTypes.ENUM("active", "paused", "completed", "failed"),
      allowNull: false,
      defaultValue: "active",
    },
    config: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    totalTrades: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "total_trades",
    },
    successfulTrades: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "successful_trades",
    },
    failedTrades: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "failed_trades",
    },
  },
  {
    sequelize,
    tableName: "strategies",
    timestamps: true,
    underscored: true,
  }
);

export default Strategy;
