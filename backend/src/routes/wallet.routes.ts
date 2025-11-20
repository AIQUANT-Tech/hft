// src/routes/wallet.routes.ts

import { Router } from "express";
import { WalletController } from "../controller/wallet.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";

const router = Router();

// POST /api/wallet/add - Add new wallet
router.post("/add", authenticateJWT, WalletController.addWallet);

// DELETE /api/wallet/remove - Remove wallet
router.delete("/remove", authenticateJWT, WalletController.removeWallet);

// GET /api/wallet/list - List all wallets
router.get("/list", authenticateJWT, WalletController.listWallets);

// GET /api/wallet/balance/:address - Get wallet balance
router.get("/balance/:address", authenticateJWT, WalletController.getBalance);

// POST /api/wallet/create - Create new wallet
router.post("/create", authenticateJWT, WalletController.createWallet);

// src/routes/wallet.routes.ts

router.post("/withdraw", authenticateJWT, WalletController.withdrawFunds);

export default router;
