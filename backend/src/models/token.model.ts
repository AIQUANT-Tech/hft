import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// PoolToken model - stores all token info
export const PoolToken = sequelize.define(
  "PoolToken",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    poolId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false, // Fast search by symbol
    },
    name: {
      type: DataTypes.STRING,
    },
    policyId: {
      type: DataTypes.STRING,
    },
    assetName: {
      type: DataTypes.STRING,
    },
    priceAda: {
      type: DataTypes.DECIMAL(20, 10),
      defaultValue: 0,
    },
    liquidityTvl: {
      type: DataTypes.DECIMAL(20, 2),
      defaultValue: 0,
    },
    assetA: {
      type: DataTypes.STRING,
    },
    assetB: {
      type: DataTypes.STRING,
    },
    dexSource: {
      type: DataTypes.STRING,
      defaultValue: "MinswapV2",
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    tableName: "pool_tokens",
    indexes: [
      { fields: ["poolId"], unique: true },
      { fields: ["symbol"] },
      { fields: ["policyId"] },
    ],
  }
);

export { sequelize };
