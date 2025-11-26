// src/services/cardano.service.ts

import { Lucid, Blockfrost, Network, toText } from "lucid-cardano";
import fs from "fs/promises";
import path from "path";
import { EncryptionUtil } from "../utils/encryption.util.js";
import { ValidationUtil } from "../utils/validation.util.js";
import config from "../config/environment.js";
import { logger } from "./logger.service.js";
import { getAdaPriceCached } from "../utils/helper.js";

interface WithdrawAsset {
  asset: string; // "ADA" or asset unit
  amount: number;
}

export class CardanoService {
  private static NETWORK: Network = "Preprod";
  private static WALLET_PATH = path.join(process.cwd(), "wallets", "cardano");

  private static async getLucidInstance(): Promise<Lucid> {
    const lucid = await Lucid.new(
      new Blockfrost(config.BLOCKFROST.URL, config.BLOCKFROST.PROJECT_ID),
      this.NETWORK
    );

    return lucid;
  }

  static async removeWallet(address: string): Promise<void> {
    try {
      // Validate address
      ValidationUtil.validateAddress(address);

      // Remove wallet file
      const safeAddress = ValidationUtil.sanitizePathComponent(address);
      const walletFilePath = path.join(this.WALLET_PATH, `${safeAddress}.json`);

      await fs.unlink(walletFilePath);
    } catch (error: any) {
      throw new Error(`Failed to remove wallet: ${error.message}`);
    }
  }

  static async listWallets(): Promise<string[]> {
    try {
      await fs.mkdir(this.WALLET_PATH, { recursive: true });
      const files = await fs.readdir(this.WALLET_PATH);

      const addresses: string[] = [];
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(this.WALLET_PATH, file);
          const content = await fs.readFile(filePath, "utf-8");
          const wallet = JSON.parse(content);
          addresses.push(wallet.address);
        }
      }

      return addresses;
    } catch (error: any) {
      throw new Error(`Failed to list wallets: ${error.message}`);
    }
  }

  static async getWalletBalance(address: string): Promise<any> {
    try {
      // Validate address
      ValidationUtil.validateAddress(address);

      // Initialize Lucid
      const lucid = await this.getLucidInstance();

      // Get UTXOs
      const utxos = await lucid.utxosAt(address);

      // Calculate balance
      let lovelace = 0n;
      const assets: { [key: string]: bigint } = {};

      for (const utxo of utxos) {
        lovelace += utxo.assets.lovelace;

        for (const [unit, quantity] of Object.entries(utxo.assets)) {
          if (unit !== "lovelace") {
            assets[unit] = (assets[unit] || 0n) + quantity;
          }
        }
      }

      // Format response
      const ada = Number(lovelace) / 1_000_000;
      const assetList = Object.entries(assets).map(([unit, quantity]) => ({
        unit,
        quantity: quantity.toString(),
        name: this.parseAssetName(unit),
      }));

      return {
        address,
        ada,
        assets: assetList,
      };
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  private static parseAssetName(unit: string): string {
    try {
      // unit format: policyId + assetName (hex)
      if (unit.length > 56) {
        const assetNameHex = unit.substring(56);
        const decoded = Buffer.from(assetNameHex, "hex").toString("utf-8");
        return (
          decoded.replace(/[^\x20-\x7E]/g, "") || unit.substring(0, 12) + "..."
        );
      }
      return unit.substring(0, 12) + "...";
    } catch {
      return unit.substring(0, 12) + "...";
    }
  }

  // static async loadWallet(address: string): Promise<Lucid> {
  //   try {
  //     // Validate address
  //     ValidationUtil.validateAddress(address);

  //     // Load wallet file
  //     const safeAddress = ValidationUtil.sanitizePathComponent(address);
  //     const walletFilePath = path.join(this.WALLET_PATH, `${safeAddress}.json`);

  //     const content = await fs.readFile(walletFilePath, "utf-8");
  //     const wallet = JSON.parse(content);

  //     // Decrypt mnemonic
  //     const mnemonic = EncryptionUtil.decrypt(wallet.encryptedMnemonic);

  //     // Initialize Lucid with wallet
  //     const lucid = await this.getLucidInstance();
  //     lucid.selectWalletFromSeed(mnemonic);

  //     return lucid;
  //   } catch (error: any) {
  //     throw new Error(`Failed to load wallet: ${error.message}`);
  //   }
  // }

  // src/services/cardano.service.ts

  static async createWallet(
    ownerAddress: string
  ): Promise<{ address: string; mnemonic: string }> {
    try {
      const lucid = await this.getLucidInstance();
      const mnemonic = lucid.utils.generateSeedPhrase();
      lucid.selectWalletFromSeed(mnemonic);
      const address = await lucid.wallet.address();

      ValidationUtil.validateAddress(address);
      ValidationUtil.validateAddress(ownerAddress);

      console.log(
        `🔐 Encrypting wallet for owner: ${ownerAddress.substring(0, 20)}...`
      );

      // ✅ Encrypt with owner address
      const encryptedMnemonic = EncryptionUtil.encrypt(mnemonic, ownerAddress);

      console.log(`✅ Wallet encrypted successfully`);

      await fs.mkdir(this.WALLET_PATH, { recursive: true });

      const safeAddress = ValidationUtil.sanitizePathComponent(address);
      const walletFilePath = path.join(this.WALLET_PATH, `${safeAddress}.json`);

      // ✅ Store owner address in wallet file
      await fs.writeFile(
        walletFilePath,
        JSON.stringify(
          {
            address,
            network: this.NETWORK,
            encryptedMnemonic,
            ownerAddress, // ✅ Store owner address
            createdAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      console.log(`✅ Wallet saved: ${address}`);

      return { address, mnemonic };
    } catch (error: any) {
      console.error("❌ Create wallet error:", error);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  static async addWallet(
    mnemonic: string,
    ownerAddress: string
  ): Promise<string> {
    try {
      ValidationUtil.validateMnemonic(mnemonic);
      ValidationUtil.validateAddress(ownerAddress);

      const lucid = await this.getLucidInstance();
      lucid.selectWalletFromSeed(mnemonic);

      const address = await lucid.wallet.address();
      ValidationUtil.validateAddress(address);

      console.log(
        `🔐 Encrypting imported wallet for owner: ${ownerAddress.substring(
          0,
          20
        )}...`
      );

      // ✅ Encrypt with owner address
      const encryptedMnemonic = EncryptionUtil.encrypt(mnemonic, ownerAddress);

      console.log(`✅ Wallet encrypted successfully`);

      await fs.mkdir(this.WALLET_PATH, { recursive: true });

      const safeAddress = ValidationUtil.sanitizePathComponent(address);
      const walletFilePath = path.join(this.WALLET_PATH, `${safeAddress}.json`);

      // ✅ Store owner address in wallet file
      await fs.writeFile(
        walletFilePath,
        JSON.stringify(
          {
            address,
            network: this.NETWORK,
            encryptedMnemonic,
            ownerAddress, // ✅ Store owner address
            createdAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      console.log(`✅ Wallet imported: ${address}`);

      return address;
    } catch (error: any) {
      throw new Error(`Failed to add wallet: ${error.message}`);
    }
  }

  static async loadWallet(address: string): Promise<Lucid> {
    try {
      ValidationUtil.validateAddress(address);

      const safeAddress = ValidationUtil.sanitizePathComponent(address);
      const walletFilePath = path.join(this.WALLET_PATH, `${safeAddress}.json`);

      console.log(`📁 Loading wallet from: ${walletFilePath}`);

      const content = await fs.readFile(walletFilePath, "utf-8");
      const wallet = JSON.parse(content);

      // ✅ Check if ownerAddress exists
      if (!wallet.ownerAddress) {
        throw new Error(
          "Wallet file is missing ownerAddress. Please re-create this wallet."
        );
      }

      console.log(
        `🔓 Decrypting seed phrase for owner: ${wallet.ownerAddress.substring(
          0,
          20
        )}...`
      );

      // ✅ Decrypt with owner address from wallet file
      const mnemonic = EncryptionUtil.decrypt(
        wallet.encryptedMnemonic,
        wallet.ownerAddress
      );

      console.log(
        `✅ Mnemonic decrypted successfully (${
          mnemonic.split(" ").length
        } words)`
      );

      const lucid = await this.getLucidInstance();
      lucid.selectWalletFromSeed(mnemonic);

      console.log(`✅ Wallet loaded successfully`);

      return lucid;
    } catch (error: any) {
      console.error(`❌ Failed to load wallet ${address}:`, error.message);
      throw new Error(`Failed to load wallet: ${error.message}`);
    }
  }

  static async getWalletsByOwner(ownerAddress: string): Promise<string[]> {
    try {
      await fs.mkdir(this.WALLET_PATH, { recursive: true });
      const files = await fs.readdir(this.WALLET_PATH);

      const addresses: string[] = []; // ✅ Array of strings

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(this.WALLET_PATH, file);
          const content = await fs.readFile(filePath, "utf-8");
          const wallet = JSON.parse(content);

          // ✅ Check if wallet belongs to owner
          try {
            const decryptedMnemonic = EncryptionUtil.decrypt(
              wallet.encryptedMnemonic,
              ownerAddress
            );

            // If decryption succeeds, this wallet belongs to the owner
            if (decryptedMnemonic) {
              addresses.push(wallet.address); // ✅ Push only the address string
            }
          } catch {
            // Decryption failed - not owner's wallet
            continue;
          }
        }
      }

      return addresses; // ✅ Return array of address strings
    } catch (error: any) {
      throw new Error(`Failed to list wallets: ${error.message}`);
    }
  }

  // ✅ Add method to verify wallet ownership
  static async verifyWalletOwnership(
    walletAddress: string,
    ownerAddress: string
  ): Promise<boolean> {
    try {
      ValidationUtil.validateAddress(walletAddress);
      ValidationUtil.validateAddress(ownerAddress);

      const safeAddress = ValidationUtil.sanitizePathComponent(walletAddress);
      const walletFilePath = path.join(this.WALLET_PATH, `${safeAddress}.json`);

      // Check if wallet file exists
      try {
        await fs.access(walletFilePath);
      } catch {
        return false; // Wallet doesn't exist
      }

      const content = await fs.readFile(walletFilePath, "utf-8");
      const wallet = JSON.parse(content);

      // Try to decrypt with owner's address
      try {
        const decryptedMnemonic = EncryptionUtil.decrypt(
          wallet.encryptedMnemonic,
          ownerAddress
        );
        return !!decryptedMnemonic; // If decryption succeeds, owner is verified
      } catch {
        return false; // Decryption failed - not the owner
      }
    } catch (error: any) {
      console.error("Ownership verification error:", error);
      return false;
    }
  }

  static async withdrawFunds(
    fromAddress: string,
    toAddress: string,
    assets: WithdrawAsset[], // ✅ Changed to array
    ownerAddress: string
  ): Promise<string> {
    try {
      ValidationUtil.validateAddress(fromAddress);
      ValidationUtil.validateAddress(toAddress);

      logger.info(
        `Withdrawing ${assets.length} asset(s) from ${fromAddress.substring(
          0,
          20
        )}...`,
        undefined,
        "wallet"
      );

      // Load wallet
      const lucid = await this.loadWallet(fromAddress);

      // Get current wallet balance
      const utxos = await lucid.wallet.getUtxos();

      // Calculate total ADA and assets
      let totalLovelace = 0n;
      const allAssets: { [key: string]: bigint } = {};

      for (const utxo of utxos) {
        totalLovelace += utxo.assets.lovelace;

        for (const [unit, quantity] of Object.entries(utxo.assets)) {
          if (unit !== "lovelace") {
            allAssets[unit] = (allAssets[unit] || 0n) + quantity;
          }
        }
      }

      const totalAda = Number(totalLovelace) / 1_000_000;

      logger.info(
        `Wallet balance: ${totalAda} ADA, ${
          Object.keys(allAssets).length
        } native assets`,
        undefined,
        "wallet"
      );

      // Build transaction
      const tx = lucid.newTx();

      // ✅ Build payload with selected assets
      const payload: { lovelace: bigint; [key: string]: bigint } = {
        lovelace: 0n, // Will be calculated
      };

      let adaAmount = 0;
      const selectedNativeAssets: string[] = [];

      // ✅ Process each selected asset
      for (const withdrawAsset of assets) {
        if (withdrawAsset.asset === "ADA") {
          adaAmount = withdrawAsset.amount;
          payload.lovelace = BigInt(
            Math.floor(withdrawAsset.amount * 1_000_000)
          );

          logger.info(
            `Selected: ${withdrawAsset.amount} ADA`,
            undefined,
            "wallet"
          );
        } else {
          // Native asset
          const assetUnit = withdrawAsset.asset;
          const assetAmount = BigInt(Math.floor(withdrawAsset.amount));

          if (!allAssets[assetUnit]) {
            throw new Error(
              `Asset ${assetUnit.substring(0, 20)}... not found in wallet`
            );
          }

          if (assetAmount > allAssets[assetUnit]) {
            throw new Error(
              `Insufficient balance for asset ${assetUnit.substring(0, 20)}...`
            );
          }

          payload[assetUnit] = assetAmount;
          selectedNativeAssets.push(assetUnit);

          logger.info(
            `Selected: ${withdrawAsset.amount} of ${assetUnit.substring(
              0,
              20
            )}...`,
            undefined,
            "wallet"
          );
        }
      }

      // ✅ If sending native assets without explicit ADA, add minimum ADA
      if (selectedNativeAssets.length > 0 && adaAmount === 0) {
        const minAdaWithAssets = BigInt(
          1_500_000 + selectedNativeAssets.length * 300_000
        ); // 1.5 ADA + 0.3 per asset
        payload.lovelace = minAdaWithAssets;

        logger.info(
          `Adding ${Number(minAdaWithAssets) / 1_000_000} ADA for ${
            selectedNativeAssets.length
          } native asset(s)`,
          undefined,
          "wallet"
        );
      }

      // ✅ Ensure minimum ADA if only sending ADA
      if (payload.lovelace === 0n && selectedNativeAssets.length === 0) {
        throw new Error("No assets selected for withdrawal");
      }

      // ✅ Send transaction
      tx.payToAddress(toAddress, payload);

      logger.info(
        `Sending ${adaAmount > 0 ? `${adaAmount} ADA` : ""}${
          adaAmount > 0 && selectedNativeAssets.length > 0 ? " + " : ""
        }${
          selectedNativeAssets.length > 0
            ? `${selectedNativeAssets.length} asset(s)`
            : ""
        } to ${toAddress.substring(0, 20)}...`,
        undefined,
        "wallet"
      );

      const completedTx = await tx.complete();
      const signedTx = await completedTx.sign().complete();
      const txHash = await signedTx.submit();

      logger.success(
        `Withdrawal transaction submitted: ${txHash}`,
        undefined,
        "wallet"
      );

      logger.info(
        `View on explorer: https://preprod.cardanoscan.io/transaction/${txHash}`,
        undefined,
        "wallet"
      );

      return txHash;
    } catch (error: any) {
      logger.error(`Withdrawal failed: ${error.message}`, undefined, "wallet");
      throw new Error(`Failed to withdraw: ${error.message}`);
    }
  }

  static async getWalletHoldings(walletAddress: string) {
    try {
      const lucid = await this.getLucidInstance();
      const utxos = await lucid.utxosAt(walletAddress);

      const assetsMap: Record<
        string,
        { policyId: string; assetName: string; amount: bigint }
      > = {};

      for (const utxo of utxos) {
        // ADA amount is always included in lovelace
        const adaAmount = utxo.assets["lovelace"] || 0n;

        // Add ADA to assetsMap with special treatment
        const existingAda = assetsMap["lovelace"] || {
          policyId: "",
          assetName: "lovelace",
          amount: 0n,
        };
        existingAda.amount += adaAmount;
        assetsMap["lovelace"] = existingAda;

        // Loop other tokens if any
        for (const unit in utxo.assets) {
          if (unit === "lovelace") continue; // skip ADA (already added)

          const amount = utxo.assets[unit];
          if (!assetsMap[unit]) {
            // Parse policyId (first 56 hex chars) and assetName (rest)
            const policyId = unit.slice(0, 56);
            const assetNameHex = unit.slice(56);
            assetsMap[unit] = {
              policyId,
              assetName: assetNameHex,
              amount,
            };
          } else {
            assetsMap[unit].amount += amount;
          }
        }
      }

      // Convert assetsMap to array grouped by token symbol (you may map policyId to symbol from DB or config)
      // Here, we just return policyId and hex assetName for now as tokenSymbol/tokenName require extra lookup
      const holdings = Object.entries(assetsMap).map(
        ([unit, { policyId, assetName, amount }]) => ({
          tokenSymbol: unit === "lovelace" ? "ADA" : unit, // replace with symbol lookup for tokens
          tokenName: unit === "lovelace" ? "ADA" : toText(assetName), // ideally lookup human-friendly names from DB/external
          policyId,
          assetName,
          amount: amount.toString(),
          priceChange24h: "0", // You can enrich this later with price API calls
          walletAddress,
        })
      );

      return holdings;
    } catch (error) {
      console.error("Failed to get wallet holdings:", error);
      return [];
    }
  }
}
