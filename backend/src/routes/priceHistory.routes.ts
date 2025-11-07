import { Router, Request, Response } from "express";
import { priceHistoryService } from "../services/priceHistoryService.js";

const router = Router();

/**
 * GET /api/price-history/:tokenId?days=30
 */
router.get("/:tokenId", async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    if (!tokenId) {
      return res
        .status(400)
        .json({ success: false, error: "tokenId is required" });
    }

    const priceData = await priceHistoryService.getTokenPriceData(
      tokenId,
      days
    );

    res.json({ success: true, data: priceData });
  } catch (error) {
    console.error("Error fetching price history:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch price history" });
  }
});

/**
 * GET /api/price-history/metrics/:tokenId
 */
router.get("/metrics/:tokenId", async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;

    const metrics = await priceHistoryService.getPriceMetrics(tokenId);

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error("Error fetching price metrics:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch price metrics" });
  }
});

export default router;
