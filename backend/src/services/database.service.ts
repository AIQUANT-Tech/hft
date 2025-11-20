import { PoolToken, sequelize } from "../models/token.model.js";
import {
  BlockfrostAdapter,
  NetworkId,
  calculateSwapExactIn,
} from "@minswap/sdk";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import Big from "big.js";
import { Op } from "sequelize";

const blockfrostAPI = new BlockFrostAPI({
  projectId: process.env.BLOCKFROST_API_KEY || "",
});

const blockfrostAdapter = new BlockfrostAdapter({
  networkId: NetworkId.TESTNET,
  blockFrost: blockfrostAPI,
});

export class DatabaseService {
  private isSyncing = false;
  private decimalCache = new Map<string, number>();

  /**
   * Fetch token decimals from Blockfrost metadata
   */
  private async getTokenDecimals(
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
      console.error(`Error fetching decimals for ${policyId}:`, err);
      // Default to 0 if not found
      return 0;
    }
  }

  /**
   * Calculate price by simulating a swap (most accurate)
   * Swap 1 token for ADA and see how much ADA we get
   */
  public calculatePriceViaSwap(
    tokenDecimals: number,
    isTokenA: boolean,
    reserveA: bigint,
    reserveB: bigint,
    symbol: string
  ): number {
    try {
      const [reserveIn, reserveOut] = isTokenA
        ? [reserveA, reserveB]
        : [reserveB, reserveA];

      if (reserveIn === 0n || reserveOut === 0n) {
        console.warn(
          `Zero reserves detected for ${symbol}: In=${reserveIn}, Out=${reserveOut}`
        );
        return 0;
      }

      // ✅ FIX: Swap 1 million tokens in their actual decimal representation
      // For MIN (0 decimals): 1M * 10^0 = 1,000,000
      // For USDC (6 decimals): 1M * 10^6 = 1,000,000,000,000
      const amountToSwap = BigInt(1_000_000 * 10 ** tokenDecimals);

      console.log(
        `  ${symbol}: decimals=${tokenDecimals}, swap input=${amountToSwap}, reserves in/out=${reserveIn}/${reserveOut}`
      );

      const { amountOut } = calculateSwapExactIn({
        amountIn: amountToSwap,
        reserveIn,
        reserveOut,
      });

      if (!amountOut || amountOut === 0n) {
        console.warn(`Zero amountOut for token ${symbol}`);
        return 0;
      }

      // Convert from lovelace to ADA
      const adaReceived = Number(amountOut) / 1_000_000;

      // ✅ Price = ADA received / tokens swapped (1 million)
      const priceInAda = adaReceived / 1_000_000;

      console.log(
        `  ${symbol}: swapped 1M tokens (${amountToSwap}) for ${amountOut} lovelace (${adaReceived} ADA) = ${priceInAda} ADA per token`
      );

      return priceInAda;
    } catch (err) {
      console.error("Error calculating price via swap:", err);
      return 0;
    }
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      await sequelize.authenticate();
      console.log("✓ Database connected");
      await sequelize.sync({ alter: false });
      console.log("✓ Database synced");
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  /**
   * Sync pools to database (runs in background)
   */
  async syncPoolsToDatabase(page: number): Promise<number> {
    try {
      console.log(`🔄 Syncing page ${page}...`);

      const v1pools = await blockfrostAdapter.getV1Pools({
        page,
      });

      if (!v1pools || v1pools.length === 0) {
        console.log(`No pools found on page ${page}`);
        return 0;
      }

      let synced = 0;

      for (const pool of v1pools) {
        try {
          const assetAStr = String(pool.assetA);
          const assetBStr = String(pool.assetB);
          const isAssetAAda = assetAStr === "lovelace" || assetAStr === "";
          const isAssetBAda = assetBStr === "lovelace" || assetBStr === "";

          // Skip non-ADA pairs
          if ((isAssetAAda && isAssetBAda) || (!isAssetAAda && !isAssetBAda)) {
            continue;
          }

          let symbol = "UNKNOWN";
          let policyId = "";
          let assetName = "";
          let priceAda = 0;
          let isTokenSideA = false;
          let tokenDecimals = 0;

          if (isAssetAAda && !isAssetBAda) {
            policyId = assetBStr.slice(0, 56);
            assetName = assetBStr.slice(56);
            symbol = this.decodeSymbol(assetName);
            isTokenSideA = false;
          } else if (isAssetBAda && !isAssetAAda) {
            policyId = assetAStr.slice(0, 56);
            assetName = assetAStr.slice(56);
            symbol = this.decodeSymbol(assetName);
            isTokenSideA = true;
          } else {
            continue;
          }

          // Fetch actual token decimals from Blockfrost
          tokenDecimals = await this.getTokenDecimals(policyId, assetName);

          // Calculate price with correct decimals
          priceAda = this.calculatePriceViaSwap(
            tokenDecimals,
            isTokenSideA,
            pool.reserveA,
            pool.reserveB,
            symbol
          );

          // Calculate TVL (ADA side value)
          let tvl = 0;
          try {
            const adaReserve = isAssetAAda ? pool.reserveA : pool.reserveB;
            tvl = Number(adaReserve) / 1_000_000;
          } catch {
            tvl = 0;
          }

          // sFIXED: Create unique poolId from asset pair
          const poolId = pool.id;

          await PoolToken.upsert({
            poolId, // FIXED: Use policyId + assetName as unique ID
            symbol,
            name: symbol,
            policyId,
            assetName,
            priceAda,
            liquidityTvl: tvl,
            assetA: assetAStr,
            assetB: assetBStr,
            lastUpdated: new Date(),
            dexSource: "MinswapV1",
          });

          synced++;
          console.log(
            `✓ ${symbol}: ${priceAda} ADA/token (${tokenDecimals} decimals)`
          );
        } catch (err) {
          console.error("Error syncing pool:", err);
        }
      }

      console.log(`✓ Synced ${synced} tokens from page ${page}`);
      return synced;
    } catch (error) {
      console.error(`Error syncing page ${page}:`, error);
      return 0;
    }
  }

  /**
   * Run sync in background periodically
   */
  syncPoolsInBackground() {
    console.log("🔄 Starting background pool sync...");

    this.runBackgroundSync();

    // Sync every 2 hours
    setInterval(() => this.runBackgroundSync(), 2 * 60 * 60 * 1000);
  }

  private async runBackgroundSync() {
    if (this.isSyncing) {
      console.log("⏳ Sync already in progress, skipping...");
      return;
    }

    this.isSyncing = true;
    try {
      for (let page = 1; page <= 10; page++) {
        await this.syncPoolsToDatabase(page);
        // Delay between pages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      console.log("✓ Background sync completed");
    } catch (error) {
      console.error("Background sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  private decodeSymbol(hexName: string): string {
    if (!hexName) return "UNKNOWN";
    try {
      const buf = Buffer.from(hexName, "hex");
      const decoded = buf
        .toString("utf8")
        .replace(/[^\x20-\x7E]/g, "")
        .trim();
      return decoded || "UNKNOWN";
    } catch {
      return "UNKNOWN";
    }
  }

  async getTokensByPage(page: number, offset: number, count: number) {
    const tokens = await PoolToken.findAndCountAll({
      // offset: offset,
      // limit: count,
      order: [["lastUpdated", "DESC"]],
    });

    return {
      page,
      offset,
      totalOnPage: tokens.count,
      data: tokens.rows,
    };
  }

  async searchTokens(query: string) {
    const lowerQuery = `%${query.toLowerCase()}%`;
    return await PoolToken.findAll({
      where: {
        [Op.or]: [
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("symbol")),
            Op.like,
            lowerQuery
          ),
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("name")),
            Op.like,
            lowerQuery
          ),
        ],
      },
      limit: 100,
    });
  }

  async getTokenByPolicyId(policyId: string) {
    return await PoolToken.findOne({
      where: { policyId },
    });
  }
}

export const databaseService = new DatabaseService();
