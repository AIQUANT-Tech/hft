// src/config/environment-refi.ts
import dotenv from "dotenv";

const NODE_ENV = process.env.NODE_ENV || "development";
console.log(`🌍 Loading environment: ${NODE_ENV}`);

dotenv.config({ path: `.env.${NODE_ENV}` });
dotenv.config({ path: ".env" });

/**
 * Helper to decrypt encrypted env values
 * Looks for KEY_ENCRYPTED in environment
 */

export const config = {
  NODE_ENV,
  PORT: Number(process.env.PORT) || 8080,

  // Blockfrost
  BLOCKFROST: {
    URL:
      process.env.BLOCKFROST_API_URL ||
      "https://cardano-preprod.blockfrost.io/api/v0",
    PROJECT_ID: process.env.BLOCKFROST_API_KEY || "",
  },

  // Database
  DATABASE: {
    HOST: process.env.DB_HOST || "localhost",
    PORT: Number(process.env.DB_PORT) || 3306,
    USER: process.env.DB_USER || "root",
    PASSWORD: process.env.DB_PASSWORD || "password",
    NAME: process.env.DB_NAME || "hft",
  },
} as const;

export default config;
