// src/controllers/wallet.controller.ts

import { Request, Response } from "express";
import { CardanoService } from "../services/cardano.service.js";
import {
  AddWalletRequest,
  RemoveWalletRequest,
} from "../types/wallet.types.js";

export class WalletController {
  static async addWallet(req: Request, res: Response): Promise<void> {
    try {
      const { seedPhrase, setDefault }: AddWalletRequest = req.body;

      if (!seedPhrase) {
        res.status(400).json({ error: "seedPhrase (mnemonic) is required" });
        return;
      }

      const address = await CardanoService.addWallet(seedPhrase);

      res.status(201).json({
        success: true,
        address,
        network: "Preprod",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async removeWallet(req: Request, res: Response): Promise<void> {
    try {
      const { address }: RemoveWalletRequest = req.body;

      if (!address) {
        res.status(400).json({ error: "address is required" });
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

  static async listWallets(req: Request, res: Response): Promise<void> {
    try {
      const wallets = await CardanoService.listWallets();

      res.status(200).json({
        success: true,
        wallets,
        network: "Preprod",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;

      if (!address) {
        res.status(400).json({ error: "address is required" });
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

  static async createWallet(req: Request, res: Response): Promise<void> {
    try {
      const { address, mnemonic } = await CardanoService.createWallet();

      res.status(201).json({
        success: true,
        address,
        mnemonic,
        network: "Preprod",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
