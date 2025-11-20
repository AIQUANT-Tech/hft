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
  PASSPHRASE: process.env.PASSPHRASE,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "your-super-secret-key-change-this",
  JWT_COOKIE_NAME: process.env.JWT_COOKIE_NAME || "auth_token",

  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  FRONTEND_URL_2: process.env.FRONTEND_URL_2 || "http://localhost:3000",

  // Encryption
  ENCRYPTION_KEY:
    process.env.ENCRYPTION_KEY ||
    "3d0a82d70d695647e91cefcf90dca572a98c439b745e15fa1a30d6aacc50e9a2",
} as const;

export default config;
