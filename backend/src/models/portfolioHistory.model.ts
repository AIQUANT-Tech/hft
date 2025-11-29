// src/models/portfolioHistory.model.ts

import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.js";

export interface PortfolioHistoryAttributes {
  id: number;
  walletAddress: string;
  date: Date;
  totalValueAda: string;
  profitLoss: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PortfolioHistoryCreationAttributes
  extends Optional<PortfolioHistoryAttributes, "id"> {}

export class PortfolioHistory
  extends Model<PortfolioHistoryAttributes, PortfolioHistoryCreationAttributes>
  implements PortfolioHistoryAttributes
{
  declare id: number;
  declare walletAddress: string;
  declare date: Date;
  declare totalValueAda: string;
  declare profitLoss: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PortfolioHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    walletAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "wallet_address",
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    totalValueAda: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "total_value_ada",
    },
    profitLoss: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "profit_loss",
    },
  },
  {
    sequelize,
    tableName: "portfolio_history",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["wallet_address"] },
      { fields: ["date"] },
      { fields: ["wallet_address", "date"], unique: true },
    ],
  }
);

export default PortfolioHistory;
