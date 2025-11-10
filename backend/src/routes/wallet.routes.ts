// src/routes/wallet.routes.ts

import { Router } from "express";
import { WalletController } from "../controller/wallet.controller.js";

const router = Router();

// POST /api/wallet/add - Add new wallet
router.post("/add", WalletController.addWallet);

// DELETE /api/wallet/remove - Remove wallet
router.delete("/remove", WalletController.removeWallet);

// GET /api/wallet/list - List all wallets
router.get("/list", WalletController.listWallets);

// GET /api/wallet/balance/:address - Get wallet balance
router.get("/balance/:address", WalletController.getBalance);

// POST /api/wallet/create - Create new wallet
router.post("/create", WalletController.createWallet);

export default router;
