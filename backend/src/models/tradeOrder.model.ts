// src/models/tradeOrder.model.ts

import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.js";

export interface TradeOrderAttributes {
  id: string;
  walletAddress: string;
  tradingPair: string;
  baseToken: string;
  quoteToken: string;
  isBuy: boolean;
  amount: number;
  targetPrice: string; // ✅ Changed to STRING
  currentPrice: string; // ✅ Changed to STRING
  triggerAbove: boolean;
  status: "pending" | "executing" | "completed" | "failed";
  txHash?: string;
  executedPrice?: string; // ✅ Changed to STRING
  executedAt?: Date;
  errorMessage?: string;
  poolId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TradeOrderCreationAttributes
  extends Optional<TradeOrderAttributes, "id"> {}

export class TradeOrder
  extends Model<TradeOrderAttributes, TradeOrderCreationAttributes>
  implements TradeOrderAttributes
{
  declare id: string;
  declare walletAddress: string;
  declare tradingPair: string;
  declare baseToken: string;
  declare quoteToken: string;
  declare isBuy: boolean;
  declare amount: number;
  declare targetPrice: string; // ✅ STRING
  declare currentPrice: string; // ✅ STRING
  declare triggerAbove: boolean;
  declare status: "pending" | "executing" | "completed" | "failed";
  declare txHash?: string;
  declare executedPrice?: string; // ✅ STRING
  declare executedAt?: Date;
  declare errorMessage?: string;
  declare poolId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TradeOrder.init(
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
    isBuy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: "is_buy",
    },
    amount: {
      type: DataTypes.DECIMAL(30, 10),
      allowNull: false,
    },
    targetPrice: {
      type: DataTypes.STRING(50), // ✅ Store as STRING
      allowNull: false,
      field: "target_price",
    },
    currentPrice: {
      type: DataTypes.STRING(50), // ✅ Store as STRING
      allowNull: true,
      field: "current_price",
    },
    triggerAbove: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: "trigger_above",
    },
    status: {
      type: DataTypes.ENUM("pending", "executing", "completed", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    txHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "tx_hash",
    },
    executedPrice: {
      type: DataTypes.STRING(50), // ✅ Store as STRING
      allowNull: true,
      field: "executed_price",
    },
    executedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "executed_at",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
    },
    poolId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "pool_id",
    },
  },
  {
    sequelize,
    tableName: "trade_orders",
    timestamps: true,
    underscored: true,
  }
);

export default TradeOrder;
