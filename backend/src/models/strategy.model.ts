// src/models/strategy.model.ts

import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.js";

export interface StrategyAttributes {
  id: string;
  walletAddress: string;
  name: string;
  type: "grid" | "dca" | "price-target" | "stop-loss-take-profit";
  tradingPair: string;
  baseToken: string;
  quoteToken: string;
  poolId: string;
  isActive: boolean;
  config: object; // JSON config for strategy-specific settings
  profitLoss: string;
  profitLossPercent: string;
  investedAmount: string;
  currentValue: string;
  totalTrades: number;
  successfulTrades: number;
  progress: number; // 0-100
  startedAt: Date;
  lastExecutedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StrategyCreationAttributes
  extends Optional<StrategyAttributes, "id"> {}

export class Strategy
  extends Model<StrategyAttributes, StrategyCreationAttributes>
  implements StrategyAttributes
{
  declare id: string;
  declare walletAddress: string;
  declare name: string;
  declare type: "grid" | "dca" | "price-target" | "stop-loss-take-profit";
  declare tradingPair: string;
  declare baseToken: string;
  declare quoteToken: string;
  declare poolId: string;
  declare isActive: boolean;
  declare config: object;
  declare profitLoss: string;
  declare profitLossPercent: string;
  declare investedAmount: string;
  declare currentValue: string;
  declare totalTrades: number;
  declare successfulTrades: number;
  declare progress: number;
  declare startedAt: Date;
  declare lastExecutedAt?: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Strategy.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walletAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "wallet_address",
    },
    name: {
      type: DataTypes.STRING(255),
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
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "trading_pair",
    },
    baseToken: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "base_token",
    },
    quoteToken: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "quote_token",
    },
    poolId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "pool_id",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    config: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    profitLoss: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "0",
      field: "profit_loss",
    },
    profitLossPercent: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "0",
      field: "profit_loss_percent",
    },
    investedAmount: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "0",
      field: "invested_amount",
    },
    currentValue: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "0",
      field: "current_value",
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
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "started_at",
    },
    lastExecutedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_executed_at",
    },
  },
  {
    sequelize,
    tableName: "strategies",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["wallet_address"] },
      { fields: ["type"] },
      { fields: ["is_active"] },
    ],
  }
);

export default Strategy;
