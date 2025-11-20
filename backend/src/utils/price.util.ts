import {
  BlockfrostAdapter,
  NetworkId,
  calculateSwapExactIn,
  GetPoolByIdParams,
} from "@minswap/sdk";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import environment from "../config/environment.js";
import { logger } from "../services/logger.service.js";
import Big from "big.js";
import { TokenService } from "../services/token.service.js";
import { PoolToken } from "../models/token.model.js";

const blockfrostAPI = new BlockFrostAPI({
  projectId: environment.BLOCKFROST.PROJECT_ID,
});

const blockfrostAdapter = new BlockfrostAdapter({
  networkId: NetworkId.TESTNET,
  blockFrost: blockfrostAPI,
});

export class PriceUtil {
  private static decimalCache = new Map<string, number>();

  /**
   * Fetch token decimals from Blockfrost metadata
   */
  private static async getTokenDecimals(
    policyId: string,
    assetNameHex: string
  ): Promise<number> {
    try {
      const cacheKey = `${policyId}${assetNameHex}`;

      // Check cache first
      if (this.decimalCache.has(cacheKey)) {
        return this.decimalCache.get(cacheKey)!;
      }

      const unit = `${policyId}${assetNameHex}`;
      const assetInfo = await blockfrostAPI.assetsById(unit);

      // Try to get decimals from metadata
      const decimals =
        assetInfo.onchain_metadata?.decimals ||
        assetInfo.metadata?.decimals ||
        0;

      const result = typeof decimals === "number" ? decimals : 0;

      // Cache the result
      this.decimalCache.set(cacheKey, result);
      return result;
    } catch (err) {
      logger.error(
        `Error fetching decimals for ${policyId}: ${(err as Error).message}`,
        undefined,
        "system"
      );
      return 0;
    }
  }

  /**
   * Calculate accurate token price by simulating a swap
   * Returns price in ADA per token
   */
  // src/utils/price.util.ts

  static async calculateTokenPrice(
    poolId: string,
    baseToken: string
  ): Promise<number | null> {
    try {
      const params: GetPoolByIdParams = { id: poolId };
      const pool = await blockfrostAdapter.getV1PoolById(params);

      if (!pool) {
        logger.warning(`Pool ${poolId} not found`, undefined, "order");
        return null;
      }

      const assetAStr = String(pool.assetA);
      const assetBStr = String(pool.assetB);
      const isAssetAAda = assetAStr === "lovelace" || assetAStr === "";
      const isAssetBAda = assetBStr === "lovelace" || assetBStr === "";

      let isTokenA = false;
      let policyId = "";
      let assetNameHex = "";

      if (isAssetAAda && !isAssetBAda) {
        isTokenA = false;
        policyId = assetBStr.slice(0, 56);
        assetNameHex = assetBStr.slice(56);
      } else if (isAssetBAda && !isAssetAAda) {
        isTokenA = true;
        policyId = assetAStr.slice(0, 56);
        assetNameHex = assetAStr.slice(56);
      } else {
        logger.error("Pool is not ADA paired", undefined, "order");
        return null;
      }

      const tokenDecimals = await this.getTokenDecimals(policyId, assetNameHex);

      const [reserveIn, reserveOut] = isTokenA
        ? [pool.reserveA, pool.reserveB]
        : [pool.reserveB, pool.reserveA];

      if (reserveIn === 0n || reserveOut === 0n) {
        logger.warning(`Zero reserves in pool ${poolId}`, undefined, "order");
        return null;
      }

      // ✅ Swap 1 million tokens (matches Minswap)
      const amountToSwap = BigInt(1_000_000 * 10 ** tokenDecimals);

      const { amountOut } = calculateSwapExactIn({
        amountIn: amountToSwap,
        reserveIn,
        reserveOut,
      });

      if (!amountOut || amountOut === 0n) {
        logger.warning(`Zero amountOut for pool ${poolId}`, undefined, "order");
        return null;
      }

      // Convert from lovelace to ADA
      const adaReceived = Number(amountOut) / 1_000_000;

      // Price = ADA per token (swapped 1M tokens)
      const priceInAda = adaReceived / 1_000_000;

      //   Update in DB as well when we are fetching price from pool
      try {
        await PoolToken.update(
          {
            priceAda: priceInAda,
            lastUpdated: new Date(),
          },
          {
            where: { poolId },
          }
        );
      } catch (dbError) {
        // Log but don't fail if DB update fails
        logger.warning(
          `Failed to update price in DB: ${(dbError as Error).message}`,
          undefined,
          "system"
        );
      }

      return priceInAda;
    } catch (error) {
      logger.error(
        `Error calculating price: ${(error as Error).message}`,
        undefined,
        "order"
      );
      return null;
    }
  }
}
