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
} from "@minswap/sdk";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Lucid, Blockfrost } from "lucid-cardano";
import environment from "../config/environment.js";
import { EncryptionUtil } from "../utils/encryption.util.js"; // ✅ Import
import Big from "big.js";
import fs from "fs";
import path from "path";

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
      console.log("Trading bot already running");
      return;
    }

    this.isRunning = true;
    console.log("🤖 Trading bot started");

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
    console.log("🛑 Trading bot stopped");
  }

  private async checkAndExecuteTrades() {
    try {
      const pendingOrders = await TradeOrder.findAll({
        where: { status: "pending" },
      });

      if (pendingOrders.length === 0) {
        return;
      }

      console.log(`🔍 Checking ${pendingOrders.length} pending orders...`);

      for (const order of pendingOrders) {
        try {
          await this.processOrder(order);
        } catch (error) {
          console.error(`❌ Error processing order ${order.id}:`, error);
          await order.update({
            status: "failed",
            errorMessage: (error as Error).message,
          });
        }
      }
    } catch (error) {
      console.error("❌ Error in trading bot:", error);
    }
  }

  private async processOrder(order: TradeOrder) {
    try {
      const currentPrice = await this.getCurrentPrice(order.baseToken);

      if (!currentPrice) {
        console.log(`⚠️ No price for ${order.tradingPair}`);
        return;
      }

      await order.update({ currentPrice });

      const conditionMet = order.triggerAbove
        ? currentPrice > Number(order.targetPrice)
        : currentPrice < Number(order.targetPrice);

      const priceDiff = Math.abs(currentPrice - Number(order.targetPrice));
      const pricePct = (priceDiff / Number(order.targetPrice)) * 100;

      console.log(
        `📊 ${order.tradingPair}: Current ${currentPrice.toFixed(
          6
        )} | Target ${Number(order.targetPrice).toFixed(6)} | ${
          conditionMet ? "✅ CONDITION MET" : "⏳ WAITING"
        } (${pricePct.toFixed(2)}% away)`
      );

      if (!conditionMet) {
        return;
      }

      console.log(
        `🚀 Executing ${order.isBuy ? "BUY" : "SELL"} order for ${
          order.tradingPair
        }...`
      );

      await order.update({ status: "executing" });

      const txHash = await this.executeSwap(order);

      await order.update({
        status: "completed",
        executedPrice: currentPrice,
        executedAt: new Date(),
        txHash: txHash,
      });

      console.log(`✅ Order ${order.id} completed!`);
      console.log(`🔗 TX Hash: ${txHash}`);
      console.log(
        `🔍 View on explorer: https://preprod.cardanoscan.io/transaction/${txHash}`
      );
    } catch (error) {
      console.error(`❌ Error processing order ${order.id}:`, error);
      throw error;
    }
  }

  private async getCurrentPrice(baseToken: string): Promise<number | null> {
    try {
      const policyId = baseToken.split(".")[0];

      const poolToken = await PoolToken.findOne({
        where: { policyId },
      });

      if (!poolToken) {
        return null;
      }

      const assetAStr = poolToken.get("assetA") as string;
      const assetBStr = poolToken.get("assetB") as string;

      const assetA: Asset =
        assetAStr === "lovelace" || assetAStr === ""
          ? { policyId: "", tokenName: "" }
          : assetAStr.length >= 56
          ? { policyId: assetAStr.slice(0, 56), tokenName: assetAStr.slice(56) }
          : { policyId: "", tokenName: "" };

      const assetB: Asset =
        assetBStr === "lovelace" || assetBStr === ""
          ? { policyId: "", tokenName: "" }
          : assetBStr.length >= 56
          ? { policyId: assetBStr.slice(0, 56), tokenName: assetBStr.slice(56) }
          : { policyId: "", tokenName: "" };

      const pool = await blockfrostAdapter.getV2PoolByPair(assetA, assetB);

      if (!pool) {
        return null;
      }

      const [priceA, priceB] = await blockfrostAdapter.getV2PoolPrice({ pool });

      const isAAda = assetAStr === "lovelace" || assetAStr === "";
      const isBAda = assetBStr === "lovelace" || assetBStr === "";

      if (isAAda && !isBAda) {
        return Number(Big(priceB.toString()).div(1_000_000).toString());
      } else if (isBAda && !isAAda) {
        return Number(Big(priceA.toString()).div(1_000_000).toString());
      }

      return null;
    } catch (error) {
      console.error("❌ Error fetching price:", error);
      return null;
    }
  }

  // ✅ FIXED: Load and decrypt seed phrase
  private async executeSwap(order: TradeOrder): Promise<string> {
    try {
      console.log(
        `💰 Executing REAL swap: ${order.isBuy ? "BUY" : "SELL"} ${
          order.amount
        } ${order.tradingPair}`
      );

      // Initialize Lucid
      const lucid = await Lucid.new(
        new Blockfrost(
          environment.BLOCKFROST.URL,
          environment.BLOCKFROST.PROJECT_ID
        ),
        "Preprod"
      );

      // ✅ Load wallet with encrypted seed phrase
      const walletPath = path.join(
        process.cwd(),
        "wallets",
        "cardano",
        `${order.walletAddress}.json`
      );

      console.log(`📁 Loading wallet from: ${walletPath}`);

      if (!fs.existsSync(walletPath)) {
        throw new Error(`Wallet file not found: ${walletPath}`);
      }

      const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));

      // ✅ Decrypt the seed phrase
      if (!walletData.encryptedMnemonic) {
        throw new Error(
          `Encrypted mnemonic not found in wallet file: ${walletPath}`
        );
      }

      console.log(`🔓 Decrypting seed phrase...`);
      const seedPhrase = EncryptionUtil.decrypt(walletData.encryptedMnemonic);

      if (!seedPhrase) {
        throw new Error("Failed to decrypt seed phrase");
      }

      console.log(`✅ Seed phrase decrypted successfully`);

      // ✅ Select wallet from seed phrase
      lucid.selectWalletFromSeed(seedPhrase);

      // Get wallet address to verify
      const walletAddress = await lucid.wallet.address();
      console.log(`✅ Wallet loaded: ${walletAddress}`);

      if (walletAddress !== order.walletAddress) {
        throw new Error(
          `Wallet address mismatch! Expected: ${order.walletAddress}, Got: ${walletAddress}`
        );
      }

      // Get pool
      const policyId = order.baseToken.split(".")[0];
      const assetName = order.baseToken.split(".")[1] || "";

      const poolToken = await PoolToken.findOne({ where: { policyId } });

      if (!poolToken) {
        throw new Error("Pool not found");
      }

      // Build Asset objects
      const baseAsset: Asset = {
        policyId: policyId,
        tokenName: assetName,
      };

      const quoteAsset: Asset = { policyId: "", tokenName: "" }; // ADA

      const pool = await blockfrostAdapter.getV2PoolByPair(
        baseAsset,
        quoteAsset
      );

      if (!pool) {
        throw new Error("Pool not found on DEX");
      }

      console.log(`📊 Found pool: ${pool.totalLiquidity}`);

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

      const slippagePct = 1n;
      const dex = new Dex(lucid as any);

      const availableUtxos = await lucid.wallet.getUtxos();
      console.log(`💰 Found ${availableUtxos.length} UTXOs`);

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

        console.log(
          `📊 Buying ${exactBaseOut} base tokens with maximum ${maximumAmountIn} lovelace`
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

        console.log(`✅ BUY transaction submitted: ${txHash}`);
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

        console.log(
          `📊 Selling ${amountIn} base tokens for minimum ${minimumAmountOut} lovelace`
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

        console.log(`✅ SELL transaction submitted: ${txHash}`);
        return txHash;
      }
    } catch (error) {
      console.error(`❌ Swap execution failed:`, error);
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
  }) {
    const order = await TradeOrder.create({
      ...orderData,
      status: "pending",
    });

    console.log(`📝 Created order ${order.id} for ${orderData.tradingPair}`);
    return order;
  }
}

export const tradingBotService = new TradingBotService();
