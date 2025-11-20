// src/controllers/wallet.controller.ts

import { Response } from "express";
import { CardanoService } from "../services/cardano.service.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { logger } from "../services/logger.service.js";

export class WalletController {
  // Create wallet - only authenticated user
  static async createWallet(req: AuthRequest, res: Response): Promise<void> {
    try {
      // ✅ Get owner address from authenticated user (from JWT)
      const ownerAddress = req.user?.walletAddress;

      if (!ownerAddress) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const { address, mnemonic } = await CardanoService.createWallet(
        ownerAddress
      );

      res.status(201).json({
        success: true,
        address,
        mnemonic,
        network: "Preprod",
        message: "⚠️ Save this mnemonic securely. It will not be shown again.",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ✅ Import wallet - only authenticated user
  static async addWallet(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { seedPhrase } = req.body;

      if (!seedPhrase) {
        res.status(400).json({
          success: false,
          error: "seedPhrase (mnemonic) is required",
        });
        return;
      }

      // ✅ Get owner address from authenticated user
      const ownerAddress = req.user?.walletAddress;

      if (!ownerAddress) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const address = await CardanoService.addWallet(seedPhrase, ownerAddress);

      res.status(201).json({
        success: true,
        address,
        network: "Preprod",
        message: "Wallet imported successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async listWallets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ownerAddress = req.user?.walletAddress;

      if (!ownerAddress) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      // ✅ Get only user's wallets (returns string[])
      const userWallets = await CardanoService.getWalletsByOwner(ownerAddress);

      res.status(200).json({
        success: true,
        wallets: userWallets, // ✅ Array of address strings
        network: "Preprod",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ✅ Remove wallet - verify ownership
  static async removeWallet(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { address } = req.body;

      if (!address) {
        res.status(400).json({
          success: false,
          error: "address is required",
        });
        return;
      }

      const ownerAddress = req.user?.walletAddress;

      if (!ownerAddress) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      // ✅ Verify ownership before deletion
      const isOwner = await CardanoService.verifyWalletOwnership(
        address,
        ownerAddress
      );

      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: "You don't have permission to delete this wallet",
        });
        return;
      }

      await CardanoService.removeWallet(address);

      res.status(200).json({
        success: true,
        message: `Wallet ${address} removed successfully`,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ✅ Get balance - verify ownership
  static async getBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { address } = req.params;

      if (!address) {
        res.status(400).json({
          success: false,
          error: "address is required",
        });
        return;
      }

      const ownerAddress = req.user?.walletAddress;

      if (!ownerAddress) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      // ✅ Verify ownership before showing balance
      const isOwner = await CardanoService.verifyWalletOwnership(
        address,
        ownerAddress
      );

      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: "You don't have permission to view this wallet",
        });
        return;
      }

      const balance = await CardanoService.getWalletBalance(address);

      res.status(200).json({
        success: true,
        ...balance,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ✅ Withdraw funds - verify ownership
  static async withdrawFunds(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { fromAddress, toAddress, assets } = req.body; // ✅ Changed to assets array
      const userAddress = req.user?.walletAddress;

      if (!userAddress) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      // Verify ownership
      const isOwner = await CardanoService.verifyWalletOwnership(
        fromAddress,
        userAddress
      );

      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: "Not authorized to withdraw from this wallet",
        });
        return;
      }

      if (!Array.isArray(assets) || assets.length === 0) {
        res.status(400).json({
          success: false,
          error: "No assets selected for withdrawal",
        });
        return;
      }

      const txHash = await CardanoService.withdrawFunds(
        fromAddress,
        toAddress,
        assets,
        userAddress
      );

      logger.success(
        `Withdrawal successful: ${
          assets.length
        } asset(s) to ${toAddress.substring(0, 20)}...`,
        undefined,
        "wallet"
      );

      res.json({
        success: true,
        txHash,
        message: "Withdrawal successful",
      });
    } catch (error: any) {
      logger.error(`Withdrawal failed: ${error.message}`, undefined, "wallet");
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
