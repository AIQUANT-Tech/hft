import { databaseService } from "../services/databaseService.js";

/**
 * Run this periodically (every 2-6 hours) to update pool data
 * Schedule with node-cron or AWS Lambda
 */
export async function syncAllPools() {
  console.log("🔄 Starting pool sync...");
  try {
    let page = 1;
    const maxPages = 50; // Sync first 50 pages = 5000 pools

    while (page <= maxPages) {
      await databaseService.syncPoolsToDatabase(page);
      page++;
      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("✓ Pool sync complete");
  } catch (error) {
    console.error("Pool sync failed:", error);
  }
}
