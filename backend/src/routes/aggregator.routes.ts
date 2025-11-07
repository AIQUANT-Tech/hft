import { Router, Request, Response } from "express";
import { aggregatorService } from "../services/aggregatorService.js";

const router = Router();

/**
 * GET /api/aggregator/ada-price?currency=usd
 */
router.get("/ada-price", async (req: Request, res: Response) => {
  try {
    const currency = (req.query.currency as string) || "usd";
    const priceData = await aggregatorService.getAdaPrice(currency);
    res.json({ success: true, data: priceData });
  } catch (error) {
    console.error("Error fetching ADA price:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch ADA price" });
  }
});

/**
 * POST /api/aggregator/search-tokens
 */
router.post("/search-tokens", async (req: Request, res: Response) => {
  try {
    const { query = "", onlyVerified = true } = req.body;

    const result = await aggregatorService.searchTokens(query, onlyVerified);

    res.json({
      success: true,
      count: result.tokens.length,
      data: result.tokens,
      search_after: result.search_after,
    });
  } catch (error) {
    console.error("Error searching tokens:", error);
    res.status(500).json({ success: false, error: "Failed to search tokens" });
  }
});

/**
 * POST /api/aggregator/estimate-swap
 */
router.post("/estimate-swap", async (req: Request, res: Response) => {
  try {
    const {
      amount,
      token_in,
      token_out,
      slippage,
      allow_multi_hops = true,
      amount_in_decimal = true,
    } = req.body;

    if (!amount || !token_in || !token_out || slippage === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: amount, token_in, token_out, slippage",
      });
    }

    const estimate = await aggregatorService.estimateSwap({
      amount,
      token_in,
      token_out,
      slippage,
      allow_multi_hops,
      amount_in_decimal,
    });

    res.json({ success: true, data: estimate });
  } catch (error) {
    console.error("Error estimating swap:", error);
    res.status(500).json({ success: false, error: "Failed to estimate swap" });
  }
});

/**
 * POST /api/aggregator/build-swap-tx
 */
router.post("/build-swap-tx", async (req: Request, res: Response) => {
  try {
    const { sender, min_amount_out, estimate, amount_in_decimal } = req.body;

    if (!sender || !min_amount_out || !estimate) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: sender, min_amount_out, estimate",
      });
    }

    const transaction = await aggregatorService.buildSwapTransaction({
      sender,
      min_amount_out,
      estimate,
      amount_in_decimal,
    });

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error("Error building swap transaction:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to build swap transaction" });
  }
});

/**
 * POST /api/aggregator/submit-swap-tx
 */
router.post("/submit-swap-tx", async (req: Request, res: Response) => {
  try {
    const { cbor, witness_set } = req.body;

    if (!cbor || !witness_set) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: cbor, witness_set",
      });
    }

    const result = await aggregatorService.submitSwapTransaction({
      cbor,
      witness_set,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error submitting swap transaction:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to submit swap transaction" });
  }
});

/**
 * GET /api/aggregator/pending-orders?wallet=addr1...
 */
router.get("/pending-orders", async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: "Missing required query parameter: wallet",
      });
    }

    const orders = await aggregatorService.getPendingOrders(wallet);
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error("Error fetching pending orders:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch pending orders" });
  }
});

export default router;
