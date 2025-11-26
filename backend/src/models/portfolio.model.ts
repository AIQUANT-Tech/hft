// src/models/portfolio.model.ts

import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.js";

export interface PortfolioAttributes {
  id: number;
  walletAddress: string;
  totalValueAda: string;
  totalGainLoss: string;
  totalGainLossPercent: string;
  todayProfit: string;
  todayProfitPercent: string;
  activeStrategiesCount: number;
  lastUpdated: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PortfolioCreationAttributes
  extends Optional<PortfolioAttributes, "id"> {}

export class Portfolio
  extends Model<PortfolioAttributes, PortfolioCreationAttributes>
  implements PortfolioAttributes
{
  declare id: number;
  declare walletAddress: string;
  declare totalValueAda: string;
  declare totalGainLoss: string;
  declare totalGainLossPercent: string;
  declare todayProfit: string;
  declare todayProfitPercent: string;
  declare activeStrategiesCount: number;
  declare lastUpdated: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Portfolio.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    walletAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "wallet_address",
    },
    totalValueAda: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "0",
      field: "total_value_ada",
    },

    totalGainLoss: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "0",
      field: "total_gain_loss",
    },
    totalGainLossPercent: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "0",
      field: "total_gain_loss_percent",
    },
    todayProfit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "0",
      field: "today_profit",
    },
    todayProfitPercent: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "0",
      field: "today_profit_percent",
    },
    activeStrategiesCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "active_strategies_count",
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "last_updated",
    },
  },
  {
    sequelize,
    tableName: "portfolios",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["wallet_address"], unique: true }],
  }
);

export default Portfolio;
