// src/services/tradingBot.service.ts

import { TradeOrder } from "../models/tradeOrder.model.js";
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
import { logger } from "./logger.service.js"; // Import logger
import fs from "fs";
import path, { parse } from "path";
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

  // src/services/tradingBot.service.ts

  private async processOrder(order: TradeOrder) {
    try {
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

      // ✅ Store as string with full precision
      const currentPriceStr = currentPrice.toFixed(20).replace(/\.?0+$/, "");
      await order.update({ currentPrice: currentPriceStr });

      // ✅ Parse target price from string
      const targetPrice = parseFloat(order.targetPrice);

      const conditionMet = order.triggerAbove
        ? currentPrice > targetPrice
        : currentPrice < targetPrice;

      const priceDiff = Math.abs(currentPrice - targetPrice);
      const pricePct = (priceDiff / targetPrice) * 100;

      logger.info(
        `${order.tradingPair}: Current ${currentPriceStr} | Target ${
          order.targetPrice
        } | ${
          conditionMet ? "✅ CONDITION MET" : "⏳ WAITING"
        } (${pricePct.toFixed(2)}% away)`,
        undefined,
        "order"
      );

      if (!conditionMet) {
        return;
      }

      logger.success(
        `🎯 Executing ${order.isBuy ? "BUY" : "SELL"} order for ${
          order.tradingPair
        }`,
        undefined,
        "order"
      );

      await order.update({ status: "executing" });

      const txHash = await this.executeSwap(order);

      await order.update({
        status: "completed",
        executedPrice: currentPriceStr,
        executedAt: new Date(),
        txHash: txHash,
      });

      logger.success(
        `✅ Order ${order.id} completed! TX: ${txHash}`,
        undefined,
        "order"
      );
      logger.info(
        `🔗 https://preprod.cardanoscan.io/transaction/${txHash}`,
        undefined,
        "order"
      );
    } catch (error) {
      logger.error(
        `❌ Error processing order ${order.id}: ${(error as Error).message}`,
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
    // ✅ Convert target price to string with full precision
    const targetPriceStr = orderData.targetPrice
      .toFixed(20)
      .replace(/\.?0+$/, "");

    logger.info(
      `📝 Creating order: ${orderData.isBuy ? "BUY" : "SELL"} ${
        orderData.tradingPair
      } @ ${targetPriceStr} ADA`,
      undefined,
      "order"
    );

    const order = await TradeOrder.create({
      ...orderData,
      targetPrice: targetPriceStr, // ✅ Store as string
      currentPrice: "0", // ✅ Initialize with string
      status: "pending",
    });

    logger.success(
      `✅ Order ${order.id} created for ${orderData.tradingPair}`,
      undefined,
      "order"
    );

    return order;
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
  // src/services/tradingBot.service.ts

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

      // Load wallet
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

      lucid.selectWalletFromSeed(seedPhrase);

      const walletAddress = await lucid.wallet.address();
      logger.success(`Wallet loaded: ${walletAddress}`, undefined, "wallet");

      if (walletAddress !== order.walletAddress) {
        throw new Error(
          `Wallet address mismatch! Expected: ${order.walletAddress}, Got: ${walletAddress}`
        );
      }

      // ✅ Check wallet balance
      const utxos = await lucid.wallet.getUtxos();
      logger.info(`Found ${utxos.length} UTXOs`, undefined, "wallet");

      if (utxos.length === 0) {
        throw new Error("No UTXOs available in wallet");
      }

      // ✅ Parse token info correctly
      const [policyId, assetNameHex] = order.baseToken.split(".");

      if (!policyId || !assetNameHex) {
        throw new Error(`Invalid baseToken format: ${order.baseToken}`);
      }

      const baseAsset: Asset = {
        policyId,
        tokenName: assetNameHex,
      };

      logger.info(`Asset: ${policyId}.${assetNameHex}`, undefined, "order");

      // ✅ Check if wallet has enough tokens for SELL
      if (!order.isBuy) {
        const assetUnit = policyId + assetNameHex;
        let totalTokens = 0n;

        for (const utxo of utxos) {
          const assetValue = utxo.assets[assetUnit];
          if (assetValue) {
            totalTokens += BigInt(assetValue);
          }
        }

        const requiredTokens = BigInt(Math.floor(Number(order.amount)));

        logger.info(
          `Wallet balance: ${totalTokens.toString()} MIN tokens`,
          undefined,
          "wallet"
        );
        logger.info(
          `Required: ${requiredTokens.toString()} MIN tokens`,
          undefined,
          "order"
        );

        if (totalTokens < requiredTokens) {
          throw new Error(
            `Insufficient MIN tokens! Have: ${totalTokens}, Need: ${requiredTokens}`
          );
        }
      }

      // Get pool
      const poolId = order.poolId;
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

      logger.info(
        `Reserve In: ${reserveIn.toString()}, Reserve Out: ${reserveOut.toString()}`,
        undefined,
        "order"
      );

      const slippagePct = 5n; // ✅ Increase slippage to 5% for testnet
      const dex = new Dex(lucid as any);

      const availableUtxos = await lucid.wallet.getUtxos();

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

        // ✅ Add try-catch for swap building
        let swapTx;
        try {
          swapTx = await dex.buildSwapExactOutTx({
            sender: walletAddress,
            availableUtxos,
            assetIn: ADA,
            maximumAmountIn,
            assetOut: baseAsset,
            expectedAmountOut: exactBaseOut,
          });
        } catch (swapError: any) {
          logger.error(
            `Failed to build swap TX: ${swapError.message || swapError}`,
            undefined,
            "order"
          );
          throw new Error(
            `Swap building failed: ${swapError.message || "Unknown error"}`
          );
        }

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

        // ✅ Add try-catch for swap building
        let swapTx;
        try {
          swapTx = await dex.buildSwapExactInTx({
            sender: walletAddress,
            availableUtxos,
            assetIn: baseAsset,
            amountIn,
            assetOut: ADA,
            minimumAmountOut,
            isLimitOrder: false,
          });
        } catch (swapError: any) {
          logger.error(
            `Failed to build swap TX: ${swapError.message || swapError}`,
            undefined,
            "order"
          );
          throw new Error(
            `Swap building failed: ${swapError.message || "Unknown error"}`
          );
        }

        const signedTx = await swapTx.sign().complete();
        const txHash = await signedTx.submit();

        logger.success(
          `SELL transaction submitted: ${txHash}`,
          undefined,
          "order"
        );
        return txHash;
      }
    } catch (error: any) {
      // ✅ Better error logging
      logger.error(
        `Swap execution failed: ${error.message || error.toString()}`,
        undefined,
        "order"
      );
      logger.error(
        `Error stack: ${error.stack || "No stack trace"}`,
        undefined,
        "order"
      );
      throw error;
    }
  }
}

export const tradingBotService = new TradingBotService();
