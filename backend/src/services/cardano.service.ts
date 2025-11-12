// src/services/cardano.service.ts

import { Lucid, Blockfrost, Network } from "lucid-cardano";
import fs from "fs/promises";
import path from "path";
import { EncryptionUtil } from "../utils/encryption.util.js";
import { ValidationUtil } from "../utils/validation.util.js";
import config from "../config/environment.js";

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

  static async addWallet(mnemonic: string): Promise<string> {
    try {
      // Validate mnemonic
      ValidationUtil.validateMnemonic(mnemonic);

      // Initialize Lucid
      const lucid = await this.getLucidInstance();

      // Select wallet from mnemonic
      lucid.selectWalletFromSeed(mnemonic);

      // Get address
      const address = await lucid.wallet.address();

      // Validate address
      ValidationUtil.validateAddress(address);

      // Encrypt mnemonic
      const encryptedMnemonic = EncryptionUtil.encrypt(mnemonic);

      // Ensure wallet directory exists
      await fs.mkdir(this.WALLET_PATH, { recursive: true });

      // Save encrypted wallet
      const safeAddress = ValidationUtil.sanitizePathComponent(address);
      const walletFilePath = path.join(this.WALLET_PATH, `${safeAddress}.json`);

      await fs.writeFile(
        walletFilePath,
        JSON.stringify(
          {
            address,
            network: this.NETWORK,
            encryptedMnemonic,
            createdAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      return address;
    } catch (error: any) {
      throw new Error(`Failed to add wallet: ${error.message}`);
    }
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
      const ada = (Number(lovelace) / 1_000_000).toFixed(6);
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

  static async loadWallet(address: string): Promise<Lucid> {
    try {
      // Validate address
      ValidationUtil.validateAddress(address);

      // Load wallet file
      const safeAddress = ValidationUtil.sanitizePathComponent(address);
      const walletFilePath = path.join(this.WALLET_PATH, `${safeAddress}.json`);

      const content = await fs.readFile(walletFilePath, "utf-8");
      const wallet = JSON.parse(content);

      // Decrypt mnemonic
      const mnemonic = EncryptionUtil.decrypt(wallet.encryptedMnemonic);

      // Initialize Lucid with wallet
      const lucid = await this.getLucidInstance();
      lucid.selectWalletFromSeed(mnemonic);

      return lucid;
    } catch (error: any) {
      throw new Error(`Failed to load wallet: ${error.message}`);
    }
  }

  static async createWallet(): Promise<{ address: string; mnemonic: string }> {
    try {
      // Initialize Lucid
      const lucid = await this.getLucidInstance();

      // Generate mnemonic
      const mnemonic = lucid.utils.generateSeedPhrase();
      lucid.selectWalletFromSeed(mnemonic);

      const address = await lucid.wallet.address();

      // Validate address
      ValidationUtil.validateAddress(address);

      // Encrypt mnemonic
      const encryptedMnemonic = EncryptionUtil.encrypt(mnemonic);

      // Ensure wallet directory exists
      await fs.mkdir(this.WALLET_PATH, { recursive: true });

      // Save encrypted wallet
      const safeAddress = ValidationUtil.sanitizePathComponent(address);
      const walletFilePath = path.join(this.WALLET_PATH, `${safeAddress}.json`);

      await fs.writeFile(
        walletFilePath,
        JSON.stringify(
          {
            address,
            network: this.NETWORK,
            encryptedMnemonic,
            createdAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      return { address, mnemonic };
    } catch (error: any) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }
}
