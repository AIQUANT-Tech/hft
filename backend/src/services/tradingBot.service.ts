// src/services/tradingBot.service.ts

import { TradeOrder } from "../models/tradeOrder.model.js";
import { PoolToken } from "../models/token.model.js";
import {
  BlockfrostAdapter,
  NetworkId,
  Asset,
  ADA,
  Dex,
  calculateSwapExactIn,
  calculateSwapExactOut,
  GetPoolByIdParams,
  PoolV1,
} from "@minswap/sdk";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Lucid, Blockfrost, Data } from "lucid-cardano";
import environment from "../config/environment.js";
import { EncryptionUtil } from "../utils/encryption.util.js";
import { logger } from "./logger.service.js"; // ✅ Import logger
import Big from "big.js";
import fs from "fs";
import path from "path";
import { PriceUtil } from "../utils/price.util.js";

const blockfrostAPI = new BlockFrostAPI({
  projectId: environment.BLOCKFROST.PROJECT_ID,
});

const blockfrostAdapter = new BlockfrostAdapter({
  networkId: NetworkId.TESTNET,
  blockFrost: blockfrostAPI,
});

export class TradingBotService {
  private isRunning = false;
  private checkInterval = 10000;
  private intervalId?: NodeJS.Timeout;

  async start() {
    if (this.isRunning) {
      logger.warning("Trading bot already running", undefined, "system");
      return;
    }

    this.isRunning = true;
    logger.success("Trading bot started", undefined, "system");

    await this.checkAndExecuteTrades();

    this.intervalId = setInterval(async () => {
      await this.checkAndExecuteTrades();
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    logger.warning("Trading bot stopped", undefined, "system");
  }

  private async checkAndExecuteTrades() {
    try {
      const pendingOrders = await TradeOrder.findAll({
        where: { status: "pending" },
      });

      if (pendingOrders.length === 0) {
        return;
      }

      logger.info(
        `Checking ${pendingOrders.length} pending orders...`,
        undefined,
        "order"
      );

      for (const order of pendingOrders) {
        try {
          await this.processOrder(order);
        } catch (error) {
          logger.error(
            `Error processing order ${order.id}: ${(error as Error).message}`,
            undefined,
            "order"
          );
          await order.update({
            status: "failed",
            errorMessage: (error as Error).message,
          });
        }
      }
    } catch (error) {
      logger.error(
        `Error in trading bot: ${(error as Error).message}`,
        undefined,
        "system"
      );
    }
  }

  private async processOrder(order: TradeOrder) {
    try {
      // ✅ Use accurate swap-based pricing
      const currentPrice = await PriceUtil.calculateTokenPrice(
        order.poolId,
        order.baseToken
      );

      if (!currentPrice) {
        logger.warning(
          `No price available for ${order.tradingPair}`,
          undefined,
          "order"
        );
        return;
      }

      await order.update({ currentPrice });

      const conditionMet = order.triggerAbove
        ? currentPrice > Number(order.targetPrice)
        : currentPrice < Number(order.targetPrice);

      const priceDiff = Math.abs(currentPrice - Number(order.targetPrice));
      const pricePct = (priceDiff / Number(order.targetPrice)) * 100;

      logger.info(
        `${order.tradingPair}: Current ${currentPrice} | Target ${Number(
          order.targetPrice
        )} | ${
          conditionMet ? "✅ CONDITION MET" : "⏳ WAITING"
        } (${pricePct}% away)`,
        undefined,
        "order"
      );

      if (!conditionMet) {
        return;
      }

      logger.success(
        `Executing ${order.isBuy ? "BUY" : "SELL"} order for ${
          order.tradingPair
        }`,
        undefined,
        "order"
      );

      await order.update({ status: "executing" });

      const txHash = await this.executeSwap(order);

      await order.update({
        status: "completed",
        executedPrice: currentPrice,
        executedAt: new Date(),
        txHash: txHash,
      });

      logger.success(`Order ${order.id} completed!`, undefined, "order");
      logger.info(`TX Hash: ${txHash}`, undefined, "order");
      logger.info(
        `View on explorer: https://preprod.cardanoscan.io/transaction/${txHash}`,
        undefined,
        "order"
      );
    } catch (error) {
      logger.error(
        `Error processing order ${order.id}: ${(error as Error).message}`,
        undefined,
        "order"
      );
      throw error;
    }
  }

  private async getCurrentPrice(poolId: string): Promise<number | null> {
    try {
      const pool = await blockfrostAdapter.getV1PoolById({ id: poolId });

      if (!pool) {
        logger.warning(`Pool ${poolId} not found on DEX`, undefined, "order");
        return null;
      }

      const [priceA, priceB] = await blockfrostAdapter.getV1PoolPrice({
        pool,
        decimalsA: 1_000_000,
      });

      const isAAda = pool.assetA === "lovelace" || pool.assetA === "";
      const isBAda = pool.assetB === "lovelace" || pool.assetB === "";

      // ✅ FIX: Divide by 1,000,000 to convert lovelace to ADA
      if (isAAda && !isBAda) {
        return Number(priceB.toString());
      } else if (isBAda && !isAAda) {
        return Number(priceA.toString());
      }

      return null;
    } catch (error) {
      logger.error(
        `Error fetching price: ${(error as Error).message}`,
        undefined,
        "order"
      );
      return null;
    }
  }

  private async executeSwap(order: TradeOrder): Promise<string> {
    try {
      logger.info(
        `Executing REAL swap: ${order.isBuy ? "BUY" : "SELL"} ${order.amount} ${
          order.tradingPair
        }`,
        undefined,
        "order"
      );

      // Initialize Lucid
      const lucid = await Lucid.new(
        new Blockfrost(
          environment.BLOCKFROST.URL,
          environment.BLOCKFROST.PROJECT_ID
        ),
        "Preprod"
      );

      // Load wallet with encrypted seed phrase
      const walletPath = path.join(
        process.cwd(),
        "wallets",
        "cardano",
        `${order.walletAddress}.json`
      );

      logger.info(
        `Loading wallet from: ${order.walletAddress.substring(0, 20)}...`,
        undefined,
        "wallet"
      );

      if (!fs.existsSync(walletPath)) {
        throw new Error(`Wallet file not found: ${walletPath}`);
      }

      const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));

      if (!walletData.encryptedMnemonic) {
        throw new Error(
          `Encrypted mnemonic not found in wallet file: ${walletPath}`
        );
      }

      logger.info("Decrypting seed phrase...", undefined, "wallet");

      const seedPhrase = EncryptionUtil.decrypt(
        walletData.encryptedMnemonic,
        walletData.ownerAddress
      );

      if (!seedPhrase) {
        throw new Error("Failed to decrypt seed phrase");
      }

      logger.success("Seed phrase decrypted successfully", undefined, "wallet");

      // Select wallet from seed phrase
      lucid.selectWalletFromSeed(seedPhrase);

      // Get wallet address to verify
      const walletAddress = await lucid.wallet.address();
      logger.success(`Wallet loaded: ${walletAddress}`, undefined, "wallet");

      if (walletAddress !== order.walletAddress) {
        throw new Error(
          `Wallet address mismatch! Expected: ${order.walletAddress}, Got: ${walletAddress}`
        );
      }

      // Get pool
      const poolId = order.poolId;

      // const quoteAsset: Asset = { policyId: "", tokenName: "" }; // ADA
      const params: GetPoolByIdParams = {
        id: poolId,
      };
      const pool = await blockfrostAdapter.getV1PoolById(params);

      if (!pool) {
        throw new Error("Pool not found on DEX");
      }

      logger.info(`Found pool: ${pool.address}`, undefined, "order");

      // Determine reserves
      const assetAStr = String(pool.assetA);
      const assetBStr = String(pool.assetB);

      const policyId = order.baseToken.split(".")[0];
      const assetName = order.baseToken.split(".")[1];
      const baseAsset: Asset = {
        policyId,
        tokenName: assetName,
      };

      let reserveIn: bigint, reserveOut: bigint;

      if (order.isBuy) {
        // BUY: Input is ADA, Output is token
        if (assetAStr === "lovelace" || assetAStr === "") {
          reserveIn = pool.reserveA;
          reserveOut = pool.reserveB;
        } else {
          reserveIn = pool.reserveB;
          reserveOut = pool.reserveA;
        }
      } else {
        // SELL: Input is token, Output is ADA
        if (assetAStr.includes(policyId)) {
          reserveIn = pool.reserveA;
          reserveOut = pool.reserveB;
        } else {
          reserveIn = pool.reserveB;
          reserveOut = pool.reserveA;
        }
      }

      const slippagePct = 1n;
      const dex = new Dex(lucid as any);

      const availableUtxos = await lucid.wallet.getUtxos();
      logger.info(`Found ${availableUtxos.length} UTXOs`, undefined, "wallet");

      if (availableUtxos.length === 0) {
        throw new Error("No UTXOs available in wallet");
      }

      if (order.isBuy) {
        // BUY: buying BASE tokens with ADA
        const exactBaseOut = BigInt(Math.floor(Number(order.amount)));

        const { amountIn: idealQuoteIn } = calculateSwapExactOut({
          exactAmountOut: exactBaseOut,
          reserveIn,
          reserveOut,
        });

        const maximumAmountIn = (idealQuoteIn * (100n + slippagePct)) / 100n;

        logger.info(
          `Buying ${exactBaseOut} base tokens with maximum ${maximumAmountIn} lovelace`,
          undefined,
          "order"
        );

        const swapTx = await dex.buildSwapExactOutTx({
          sender: walletAddress,
          availableUtxos,
          assetIn: ADA,
          maximumAmountIn,
          assetOut: baseAsset,
          expectedAmountOut: exactBaseOut,
        });

        const signedTx = await swapTx.sign().complete();
        const txHash = await signedTx.submit();

        logger.success(
          `BUY transaction submitted: ${txHash}`,
          undefined,
          "order"
        );
        return txHash;
      } else {
        // SELL: selling BASE tokens for ADA
        const amountIn = BigInt(Math.floor(Number(order.amount)));

        const { amountOut: idealOut } = calculateSwapExactIn({
          amountIn,
          reserveIn,
          reserveOut,
        });

        const minimumAmountOut = (idealOut * (100n - slippagePct)) / 100n;

        logger.info(
          `Selling ${amountIn} base tokens for minimum ${minimumAmountOut} lovelace`,
          undefined,
          "order"
        );

        const swapTx = await dex.buildSwapExactInTx({
          sender: walletAddress,
          availableUtxos,
          assetIn: baseAsset,
          amountIn,
          assetOut: ADA,
          minimumAmountOut,
          isLimitOrder: false,
        });

        const signedTx = await swapTx.sign().complete();
        const txHash = await signedTx.submit();

        logger.success(
          `SELL transaction submitted: ${txHash}`,
          undefined,
          "order"
        );
        return txHash;
      }
    } catch (error) {
      logger.error(
        `Swap execution failed: ${(error as Error).message}`,
        undefined,
        "order"
      );
      throw error;
    }
  }

  async createOrder(orderData: {
    walletAddress: string;
    tradingPair: string;
    baseToken: string;
    quoteToken: string;
    targetPrice: number;
    triggerAbove: boolean;
    isBuy: boolean;
    amount: number;
    poolId: string;
  }) {
    console.log("targetPrice", orderData.targetPrice);

    const order = await TradeOrder.create({
      ...orderData,
      status: "pending",
    });

    logger.success(
      `Created order ${order.id} for ${orderData.tradingPair}`,
      undefined,
      "order"
    );
    return order;
  }
}

export const tradingBotService = new TradingBotService();
