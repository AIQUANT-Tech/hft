// src/models/strategy.model.ts

import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.js";

interface StrategyAttributes {
  id: string; // UUID from strategy config
  walletAddress: string;
  name: string;
  type: "grid" | "dca" | "price-target" | "stop-loss-take-profit";
  tradingPair: string;
  baseToken: string;
  quoteToken: string;
  investedAmount: string; // ADA invested
  currentValue: string; // Current position value in ADA
  profitLoss: string; // P&L in ADA
  profitLossPercent: string; // P&L percentage
  isActive: boolean;
  status: "active" | "paused" | "completed" | "failed";
  config: string; // JSON stringified config
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
  public id!: string;
  public walletAddress!: string;
  public name!: string;
  public type!: "grid" | "dca" | "price-target" | "stop-loss-take-profit";
  public tradingPair!: string;
  public baseToken!: string;
  public quoteToken!: string;
  public investedAmount!: string;
  public currentValue!: string;
  public profitLoss!: string;
  public profitLossPercent!: string;
  public isActive!: boolean;
  public status!: "active" | "paused" | "completed" | "failed";
  public config!: string;
  public totalTrades!: number;
  public successfulTrades!: number;
  public failedTrades!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
      validate: {
        notEmpty: true,
      },
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
    },
    baseToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quoteToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    investedAmount: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
      defaultValue: "0",
    },
    currentValue: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
      defaultValue: "0",
    },
    profitLoss: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
      defaultValue: "0",
    },
    profitLossPercent: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: "0",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    },
    successfulTrades: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failedTrades: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "strategies",
    timestamps: true,
  }
);

export default Strategy;
