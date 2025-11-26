// src/models/activityLog.model.ts

import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.js";

export interface ActivityLogAttributes {
  id: number;
  walletAddress: string;
  strategyId?: string;
  strategyName?: string;
  action: "BUY" | "SELL" | "CREATE" | "PAUSE" | "RESUME" | "DELETE";
  status: "pending" | "completed" | "failed";
  tradingPair?: string;
  amount?: string;
  price?: string;
  profitLoss?: string;
  txHash?: string;
  details?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ActivityLogCreationAttributes
  extends Optional<ActivityLogAttributes, "id"> {}

export class ActivityLog
  extends Model<ActivityLogAttributes, ActivityLogCreationAttributes>
  implements ActivityLogAttributes
{
  declare id: number;
  declare walletAddress: string;
  declare strategyId?: string;
  declare strategyName?: string;
  declare action: "BUY" | "SELL" | "CREATE" | "PAUSE" | "RESUME" | "DELETE";
  declare status: "pending" | "completed" | "failed";
  declare tradingPair?: string;
  declare amount?: string;
  declare price?: string;
  declare profitLoss?: string;
  declare txHash?: string;
  declare details?: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ActivityLog.init(
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
    strategyId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "strategy_id",
    },
    strategyName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "strategy_name",
    },
    action: {
      type: DataTypes.ENUM(
        "BUY",
        "SELL",
        "CREATE",
        "PAUSE",
        "RESUME",
        "DELETE"
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "completed", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    tradingPair: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "trading_pair",
    },
    amount: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    price: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    profitLoss: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "profit_loss",
    },
    txHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "tx_hash",
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "activity_logs",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["wallet_address"] },
      { fields: ["strategy_id"] },
      { fields: ["created_at"] },
    ],
  }
);

export default ActivityLog;
