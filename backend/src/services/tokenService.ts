import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { BlockfrostAdapter, NetworkId, PoolV2 } from "@minswap/sdk";
import NodeCache from "node-cache";
import Big from "big.js";
import { randomUUID } from "crypto";
import environment from "../config/environment.js";

const CACHE_TTL_SHORT = 60; // seconds
const CACHE_TTL_LONG = 60 * 60; // 1 hour

// initialize caches
const pageCache = new NodeCache({ stdTTL: CACHE_TTL_SHORT });
const metaCache = new NodeCache({ stdTTL: CACHE_TTL_LONG });

// Blockfrost & adapter
const blockfrostAPI = new BlockFrostAPI({
  projectId: environment.BLOCKFROST.PROJECT_ID || "",
});
const blockfrostAdapter = new BlockfrostAdapter({
  networkId: NetworkId.TESTNET,
  blockFrost: blockfrostAPI,
});

export interface TokenData {
  id: string;
  symbol: string;
  name: string;
  policyId: string;
  assetName: string; // hex asset name (raw)
  price_ada: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  volume_24h: number;
  liquidity_tvl: number; // ADA value (approx)
  dex_source: string;
  last_updated: string;
}

export class TokenService {
  // ---------- helpers ----------

  /**
   * Decode hex asset name to utf8 and sanitize.
   * If result is only control / invalid chars, return null.
   */
  private safeDecodeHexName(hexName?: string | null): string | null {
    if (!hexName) return null;

    // Ensure even-length hex
    if (/^[0-9a-fA-F]+$/.test(hexName) && hexName.length % 2 === 0) {
      try {
        const buf = Buffer.from(hexName, "hex");
        let s = buf.toString("utf8");

        // Remove all non-printable / control / invalid Unicode characters
        s = s.replace(/[^\x20-\x7E]+/g, "").trim();

        if (!s) return null;
        return s;
      } catch {
        return null;
      }
    }

    // Fallback: if not hex but short, maybe it's plain text
    if (hexName.length <= 32)
      return hexName.replace(/[^\x20-\x7E]+/g, "").trim();

    return null;
  }

  /**
   * Extract asset info for various shapes returned by the SDK
   * Handles:
   *  - "lovelace" or ""  => ADA
   *  - "policy.tokenHex" (dot notation)
   *  - concatenated hex unit: <policy56hex><tokenHex> (no dot)
   *  - object { policyId, tokenName } or nested shapes
   *
   * NOTE: Cardano policyId is 28 bytes = 56 hex chars.
   */
  private extractAssetInfo(asset: any): {
    isAda: boolean;
    policyId?: string;
    assetName?: string; // raw hex or string
    raw?: string;
  } {
    if (asset === null || typeof asset === "undefined") {
      return { isAda: false, raw: String(asset) };
    }

    // ADA representations
    if (asset === "lovelace" || asset === "") {
      return { isAda: true, raw: String(asset) };
    }

    // string forms
    if (typeof asset === "string") {
      // dot-separated (policy.tokenName)
      if (asset.includes(".")) {
        const [policyId, ...rest] = asset.split(".");
        const assetName = rest.join(".");
        return {
          isAda: false,
          policyId: policyId || "N/A",
          assetName,
          raw: asset,
        };
      }

      // plain hex string unit (no dot) — split policy (56 hex chars) + assetName
      if (/^[0-9a-fA-F]+$/.test(asset)) {
        if (asset.length >= 56) {
          const policyId = asset.slice(0, 56);
          const assetName = asset.slice(56) || "";
          return {
            isAda: false,
            policyId,
            assetName,
            raw: asset,
          };
        }
        return { isAda: false, raw: asset };
      }

      // otherwise unknown string
      return { isAda: false, raw: asset };
    }

    // object-like shapes
    if (typeof asset === "object") {
      const policyId =
        asset.policyId ||
        asset.policy ||
        asset.assetPolicyId ||
        asset.asset?.policyId ||
        undefined;
      const tokenName =
        asset.tokenName ||
        asset.assetName ||
        asset.token ||
        asset.asset?.tokenName ||
        asset.unit ||
        undefined;

      // If object has both policyId and empty tokenName => could be ADA object form
      if ((!policyId || policyId === "") && (!tokenName || tokenName === "")) {
        return { isAda: true, raw: JSON.stringify(asset) };
      }

      // tokenName might embed policy+token (string)
      if (typeof tokenName === "string") {
        if (tokenName.includes(".")) {
          return this.extractAssetInfo(tokenName);
        }
        if (/^[0-9a-fA-F]+$/.test(tokenName) && tokenName.length >= 56) {
          const policyFromToken = tokenName.slice(0, 56);
          const assetNameFromToken = tokenName.slice(56) || "";
          return {
            isAda: false,
            policyId: policyFromToken,
            assetName: assetNameFromToken,
            raw: JSON.stringify(asset),
          };
        }
      }

      if (policyId || tokenName) {
        return {
          isAda: false,
          policyId: policyId || "N/A",
          assetName: (typeof tokenName === "string" ? tokenName : "") || "",
          raw: JSON.stringify(asset),
        };
      }

      if (asset.asset && typeof asset.asset === "string") {
        return this.extractAssetInfo(asset.asset);
      }
      if (asset.unit && typeof asset.unit === "string") {
        return this.extractAssetInfo(asset.unit);
      }

      return { isAda: false, raw: JSON.stringify(asset) };
    }

    return { isAda: false, raw: String(asset) };
  }

  /**
   * Fetch Blockfrost asset metadata (policyId + tokenName) to get ticker/name
   * Cached (1 hour). Returns symbol and name or null if unavailable.
   */
  private async fetchAssetMeta(
    policyId: string,
    tokenNameHex: string
  ): Promise<{ symbol?: string | null; name?: string | null } | null> {
    if (!policyId || policyId === "N/A") return null;

    const unit = `${policyId}${tokenNameHex || ""}`;
    const cacheKey = `assetmeta:${unit}`;
    const cached = metaCache.get<{
      symbol?: string | null;
      name?: string | null;
    }>(cacheKey);
    if (cached) return cached;

    try {
      const resp = await blockfrostAPI.assetsById(unit);
      const symbol =
        (resp.onchain_metadata?.symbol as string) ||
        (resp.metadata?.ticker as string) ||
        (resp.onchain_metadata?.name as string) ||
        (resp.metadata?.name as string) ||
        null;
      const name =
        (resp.onchain_metadata?.name as string) ||
        (resp.metadata?.name as string) ||
        (resp.onchain_metadata?.description as string) ||
        (resp.metadata?.description as string) ||
        null;
      const meta = { symbol, name };
      metaCache.set(cacheKey, meta);
      return meta;
    } catch (err) {
      metaCache.set(cacheKey, null);
      return null;
    }
  }

  /**
   * Compute 24h metrics (price change, percentage, volume).
   * NOTE: This is a placeholder that currently returns zeros.
   *
   * TODO (recommended):
   *  - Option A: Call Minswap Aggregator API which may provide 24h price change & volume per token.
   *  - Option B: Query historical pool prices (via Blockfrost + SDK) at block/time 24h ago and compute delta.
   *  - Option C: Maintain a time-series DB that stores price snapshots and compute deltas from it.
   *
   * Keep this function async so you can plug in any of the above later without changing callers.
   */
  private async compute24hMetrics(
    _policyId: string,
    _assetNameHex: string,
    _currentPriceAda: number
  ): Promise<{
    price_change_24h: number;
    price_change_percentage_24h: number;
    volume_24h: number;
  }> {
    // fallback stub: return zeroed metrics
    return {
      price_change_24h: 0,
      price_change_percentage_24h: 0,
      volume_24h: 0,
    };
  }

  // ---------- core: paginated page fetch ----------

  /**
   * Fetch one page of Minswap V2 pools and return token info for that page only.
   * - page: 1-based
   * - count: page size (1..100)
   */
  async getMinswapTokensPage(page = 1, count = 50): Promise<TokenData[]> {
    page = Math.max(1, Math.floor(page));
    count = Math.min(100, Math.max(1, Math.floor(count)));

    const cacheKey = `minswap_tokens:p${page}:c${count}`;
    const cached = pageCache.get<TokenData[]>(cacheKey);
    if (cached) return cached;

    console.log(`Fetching Minswap V2 pools page=${page} count=${count}...`);
    const tokens: TokenData[] = [];

    try {
      const { pools, errors } = await blockfrostAdapter.getV2Pools({
        page,
        count,
      });

      if (errors && errors.length > 0) {
        console.warn(`getV2Pools errors (page ${page}):`, errors);
      }

      if (!pools || pools.length === 0) {
        pageCache.set(cacheKey, tokens);
        return tokens;
      }

      console.log(`Found ${pools.length} pools on page ${page}`);

      for (const pool of pools) {
        try {
          // get pool price (returns two Big-like values)
          const [priceA, priceB] = await blockfrostAdapter.getV2PoolPrice({
            pool,
          });

          // extract info for both sides
          const aInfo = this.extractAssetInfo(pool.assetA);
          const bInfo = this.extractAssetInfo(pool.assetB);

          // Determine ADA side
          const isAAda = aInfo.isAda;
          const isBAda = bInfo.isAda;

          // choose the token side
          let tokenPolicyId = "N/A";
          let tokenAssetNameHex = "";
          let tokenPriceNum = 0;
          if (isAAda && !isBAda) {
            tokenPolicyId = bInfo.policyId ?? "N/A";
            tokenAssetNameHex = bInfo.assetName ?? "";
            // Convert from lovelace to ADA by dividing by 1,000,000
            const priceInLovelace = priceB ? Big(priceB.toString()) : Big(0);
            tokenPriceNum = Number(priceInLovelace.div(1_000_000).toString());
          } else if (isBAda && !isAAda) {
            tokenPolicyId = aInfo.policyId ?? "N/A";
            tokenAssetNameHex = aInfo.assetName ?? "";
            // Convert from lovelace to ADA by dividing by 1,000,000
            const priceInLovelace = priceA ? Big(priceA.toString()) : Big(0);
            tokenPriceNum = Number(priceInLovelace.div(1_000_000).toString());
          } else {
            tokenPolicyId = aInfo.policyId ?? bInfo.policyId ?? "N/A";
            tokenAssetNameHex = aInfo.assetName ?? bInfo.assetName ?? "";
            tokenPriceNum = priceA
              ? Number(priceA.toString())
              : priceB
              ? Number(priceB.toString())
              : 0;
          }

          // try decode token name
          let symbol = this.safeDecodeHexName(tokenAssetNameHex) ?? null;

          // If decoding failed, try fetching Blockfrost metadata (cached)
          if (!symbol && tokenPolicyId && tokenPolicyId !== "N/A") {
            try {
              const meta = await this.fetchAssetMeta(
                tokenPolicyId,
                tokenAssetNameHex
              );
              if (meta?.symbol) symbol = String(meta.symbol);
              else if (meta?.name) symbol = String(meta.name);
            } catch {
              // ignore metadata errors
            }
          }

          // final fallbacks
          if (!symbol) {
            if (
              tokenAssetNameHex &&
              tokenAssetNameHex.length <= 32 &&
              !/^[0-9a-fA-F]+$/.test(tokenAssetNameHex)
            ) {
              symbol = tokenAssetNameHex;
            } else if (tokenPolicyId && tokenPolicyId !== "N/A") {
              symbol = tokenPolicyId.slice(0, 6); // short policy fallback
            } else {
              symbol = "UNKNOWN";
            }
          }

          // compute ADA reserve (TVL left side: convert lovelace -> ADA). Use Big to avoid overflow.
          let adaReserve = 0;
          try {
            const reserveA = pool.reserveA
              ? Big(String(pool.reserveA))
              : Big(0);
            const reserveB = pool.reserveB
              ? Big(String(pool.reserveB))
              : Big(0);

            if (isAAda) adaReserve = Number(reserveA.div(1_000_000).toString());
            else if (isBAda)
              adaReserve = Number(reserveB.div(1_000_000).toString());
            else adaReserve = 0;
          } catch {
            adaReserve = 0;
          }

          // compute 24h metrics (stub for now: returns zeros).
          const { price_change_24h, price_change_percentage_24h, volume_24h } =
            await this.compute24hMetrics(
              tokenPolicyId,
              tokenAssetNameHex,
              tokenPriceNum
            );

          tokens.push({
            id: randomUUID(),
            symbol,
            name: symbol,
            policyId: tokenPolicyId,
            assetName: tokenAssetNameHex || "",
            price_ada: tokenPriceNum,
            price_change_24h,
            price_change_percentage_24h,
            volume_24h,
            liquidity_tvl: adaReserve,
            dex_source: "MinswapV2",
            last_updated: new Date().toISOString(),
          });

          console.log(`✓ Processed ${symbol} (${tokenPolicyId})`);
        } catch (err) {
          console.error(
            "Error processing pool:",
            (err as Error).message || err
          );
        }
      }

      pageCache.set(cacheKey, tokens);
      console.log(`✓ Fetched ${tokens.length} tokens for page ${page}`);
      return tokens;
    } catch (error) {
      console.error("Error fetching Minswap tokens page:", error);
      throw error;
    }
  }

  // ---------- helpers / light conveniences ----------

  async getTokenByPolicyId(
    policyId: string,
    maxPages = 5
  ): Promise<TokenData | null> {
    if (!policyId) return null;
    for (let p = 1; p <= maxPages; p++) {
      const page = await this.getMinswapTokensPage(p, 100);
      const found = page.find((t) => t.policyId === policyId);
      if (found) return found;
      if (page.length < 100) break;
    }
    return null;
  }

  async searchTokens(query: string, maxPages = 2): Promise<TokenData[]> {
    const q = (query || "").toLowerCase().trim();
    if (!q) return [];

    const results: TokenData[] = [];
    for (let p = 1; p <= maxPages; p++) {
      const page = await this.getMinswapTokensPage(p, 100);
      for (const t of page) {
        if (
          t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)
        ) {
          results.push(t);
        }
      }
      if (page.length < 100) break;
    }
    return results;
  }

  async getAllV2Pools(): Promise<PoolV2.State[]> {
    try {
      const result = await blockfrostAdapter.getAllV2Pools();
      if (result.errors && result.errors.length > 0) {
        console.warn("getAllV2Pools errors:", result.errors);
      }
      return result.pools;
    } catch (error) {
      console.error("Error fetching all pools:", error);
      throw error;
    }
  }

  async getPoolPrice(pool: PoolV2.State): Promise<[Big, Big]> {
    try {
      return await blockfrostAdapter.getV2PoolPrice({ pool });
    } catch (error) {
      console.error("Error fetching pool price:", error);
      throw error;
    }
  }

  /**
   * Fetch tokens from a specific page with offset and count
   * OPTIMIZED: Only processes pools until we have enough tokens
   *
   * @param page - Which page of pools to fetch (1-based)
   * @param offset - Skip N tokens from that page
   * @param count - Return N tokens after offset
   */
  async getMinswapTokensPageWithOffset(
    page: number,
    offset: number,
    count: number
  ): Promise<{
    page: number;
    offset: number;
    totalOnPage: number;
    data: TokenData[];
  }> {
    page = Math.max(1, Math.floor(page));
    offset = Math.max(0, Math.floor(offset));
    count = Math.min(100, Math.max(1, Math.floor(count)));

    console.log(
      `Fetching page=${page} with offset=${offset} count=${count}...`
    );

    const tokens: TokenData[] = [];
    const targetCount = offset + count; // We need this many tokens total

    try {
      // Fetch pools from the SDK (it returns ALL pools for the page at once)
      const { pools, errors } = await blockfrostAdapter.getV2Pools({
        page,
        count: 100, // Request 100 pools from API
      });

      if (errors && errors.length > 0) {
        console.warn(`getV2Pools errors (page ${page}):`, errors.slice(0, 3));
      }

      if (!pools || pools.length === 0) {
        return {
          page,
          offset,
          totalOnPage: 0,
          data: [],
        };
      }

      console.log(`Found ${pools.length} pools on page ${page}`);
      console.log(`Need ${targetCount} tokens, then will stop processing...`);

      // Process pools ONE BY ONE until we have enough tokens
      for (const pool of pools) {
        // STOP if we already have enough tokens
        if (tokens.length >= targetCount) {
          console.log(
            `✓ Reached target of ${targetCount} tokens, stopping processing`
          );
          break;
        }

        try {
          const [priceA, priceB] = await blockfrostAdapter.getV2PoolPrice({
            pool,
          });

          const aInfo = this.extractAssetInfo(pool.assetA);
          const bInfo = this.extractAssetInfo(pool.assetB);

          const isAAda = aInfo.isAda;
          const isBAda = bInfo.isAda;

          let tokenPolicyId = "N/A";
          let tokenAssetNameHex = "";
          let tokenPriceNum = 0;

          if (isAAda && !isBAda) {
            tokenPolicyId = bInfo.policyId ?? "N/A";
            tokenAssetNameHex = bInfo.assetName ?? "";
            // Convert from lovelace to ADA by dividing by 1,000,000
            const priceInLovelace = priceB ? Big(priceB.toString()) : Big(0);
            tokenPriceNum = Number(priceInLovelace.div(1_000_000).toString());
          } else if (isBAda && !isAAda) {
            tokenPolicyId = aInfo.policyId ?? "N/A";
            tokenAssetNameHex = aInfo.assetName ?? "";
            // Convert from lovelace to ADA by dividing by 1,000,000
            const priceInLovelace = priceA ? Big(priceA.toString()) : Big(0);
            tokenPriceNum = Number(priceInLovelace.div(1_000_000).toString());
          } else {
            // Skip non-ADA pairs
            continue;
          }

          let symbol = this.safeDecodeHexName(tokenAssetNameHex) ?? null;

          if (!symbol && tokenPolicyId && tokenPolicyId !== "N/A") {
            try {
              const meta = await this.fetchAssetMeta(
                tokenPolicyId,
                tokenAssetNameHex
              );
              if (meta?.symbol) symbol = String(meta.symbol);
              else if (meta?.name) symbol = String(meta.name);
            } catch {
              // ignore
            }
          }

          if (!symbol) {
            if (
              tokenAssetNameHex &&
              tokenAssetNameHex.length <= 32 &&
              !/^[0-9a-fA-F]+$/.test(tokenAssetNameHex)
            ) {
              symbol = tokenAssetNameHex;
            } else if (tokenPolicyId && tokenPolicyId !== "N/A") {
              symbol = tokenPolicyId.slice(0, 6);
            } else {
              symbol = "UNKNOWN";
            }
          }

          let adaReserve = 0;
          try {
            const reserveA = pool.reserveA
              ? Big(String(pool.reserveA))
              : Big(0);
            const reserveB = pool.reserveB
              ? Big(String(pool.reserveB))
              : Big(0);

            if (isAAda) adaReserve = Number(reserveA.div(1_000_000).toString());
            else if (isBAda)
              adaReserve = Number(reserveB.div(1_000_000).toString());
          } catch {
            adaReserve = 0;
          }

          const { price_change_24h, price_change_percentage_24h, volume_24h } =
            await this.compute24hMetrics(
              tokenPolicyId,
              tokenAssetNameHex,
              tokenPriceNum
            );

          tokens.push({
            id: randomUUID(),
            symbol,
            name: symbol,
            policyId: tokenPolicyId,
            assetName: tokenAssetNameHex || "",
            price_ada: tokenPriceNum,
            price_change_24h,
            price_change_percentage_24h,
            volume_24h,
            liquidity_tvl: adaReserve,
            dex_source: "MinswapV2",
            last_updated: new Date().toISOString(),
          });

          console.log(
            `✓ Processed ${symbol} (${tokens.length}/${targetCount})`
          );
        } catch (err) {
          console.error(
            `Error processing pool:`,
            (err as Error).message || err
          );
        }
      }

      // Slice to get only the requested range
      const slicedTokens = tokens.slice(offset, offset + count);

      console.log(
        `✓ Processed ${tokens.length} total tokens, returning ${slicedTokens.length} (offset=${offset}, count=${count})`
      );

      return {
        page,
        offset,
        totalOnPage: tokens.length,
        data: slicedTokens,
      };
    } catch (error) {
      console.error("Error fetching tokens:", error);
      throw error;
    }
  }

  clearCache(): void {
    pageCache.flushAll();
    metaCache.flushAll();
    console.log("TokenService caches cleared");
  }
}

export const tokenService = new TokenService();
