import { Router, Request, Response } from "express";
import { databaseService } from "../services/database.service.js";

const router = Router();

/**
 * GET /api/tokens?page=1&count=10&offset=0
 * Returns tokens from DATABASE (instant)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const count = Math.min(Number(req.query.count) || 50, 100);
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const result = await databaseService.getTokensByPage(page, offset, count);

    res.json({
      success: true,
      page: result.page,
      offset: result.offset,
      count: result.data.length,
      totalOnPage: result.totalOnPage,
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tokens" });
  }
});

/**
 * GET /api/tokens/search?q=MIN
 * Searches database (instant)
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || "";
    if (!query) {
      return res.status(400).json({ success: false, error: "Query required" });
    }

    const tokens = await databaseService.searchTokens(query);

    res.json({
      success: true,
      count: tokens.length,
      data: tokens,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Search failed" });
  }
});

/**
 * GET /api/tokens/:policyId
 * Get token by policy ID (instant)
 */
router.get("/:policyId", async (req: Request, res: Response) => {
  try {
    const token = await databaseService.getTokenByPolicyId(req.params.policyId);

    if (!token) {
      return res.status(404).json({ success: false, error: "Token not found" });
    }

    res.json({ success: true, data: token });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch token" });
  }
});

export default router;
