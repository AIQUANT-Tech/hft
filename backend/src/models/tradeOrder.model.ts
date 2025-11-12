// src/models/tradeOrder.model.ts

import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.js";

export interface TradeOrderAttributes {
  id: string;
  walletAddress: string;
  tradingPair: string;
  baseToken: string;
  quoteToken: string;
  targetPrice: number;
  triggerAbove: boolean;
  isBuy: boolean;
  amount: number;
  status:
    | "pending"
    | "triggered"
    | "executing"
    | "completed"
    | "failed"
    | "cancelled";
  currentPrice?: number;
  executedPrice?: number;
  txHash?: string;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
  executedAt?: Date;
}

type TradeOrderCreationAttributes = Optional<
  TradeOrderAttributes,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "executedAt"
  | "currentPrice"
  | "executedPrice"
  | "txHash"
  | "errorMessage"
>;

//  CRITICAL FIX: Use 'declare' for ALL fields
export class TradeOrder
  extends Model<TradeOrderAttributes, TradeOrderCreationAttributes>
  implements TradeOrderAttributes
{
  declare id: string;
  declare walletAddress: string;
  declare tradingPair: string;
  declare baseToken: string;
  declare quoteToken: string;
  declare targetPrice: number;
  declare triggerAbove: boolean;
  declare isBuy: boolean;
  declare amount: number;
  declare status:
    | "pending"
    | "triggered"
    | "executing"
    | "completed"
    | "failed"
    | "cancelled";
  declare currentPrice?: number;
  declare executedPrice?: number;
  declare txHash?: string;
  declare errorMessage?: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare executedAt?: Date;
}

TradeOrder.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    tradingPair: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    baseToken: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    quoteToken: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "ADA",
    },
    targetPrice: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    triggerAbove: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isBuy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "triggered",
        "executing",
        "completed",
        "failed",
        "cancelled"
      ),
      defaultValue: "pending",
      allowNull: false,
    },
    currentPrice: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: true,
    },
    executedPrice: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: true,
    },
    txHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    executedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "trade_orders",
    timestamps: true,
  }
);

export { sequelize };
