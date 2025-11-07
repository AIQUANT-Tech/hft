import axios from "axios";
import NodeCache from "node-cache";

const COINGECKO_SEARCH = "https://api.coingecko.com/api/v3/search";
const CACHE_TTL = 60 * 60 * 24; // 24h
const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 120 });

/** Verified manual overrides */
const OVERRIDES: Record<string, string> = {
  ADA: "cardano",
  MIN: "minswap",
  SUNDAE: "sundaeswap",
  DJED: "djed",
  INDY: "indigo-protocol",
  LQ: "liqwid-finance",
  WMTX: "world-mobile-token",
  IBTC: "wrapped-bitcoin",
  IETH: "ethereum",
  USDM: "mountain-protocol-usdm",
  USDA: "anzens",
  IUSD: "indigo-protocol-iusd",
  SHEN: "shen-usd",
  SNEK: "snek",
  HOSKY: "hosky-token",
  COPI: "cornucopias",
};

/** Resolve token ticker → CoinGecko ID (cached) */
export async function getCoinGeckoId(
  ticker: string,
  projectName?: string
): Promise<string | null> {
  if (!ticker || typeof ticker !== "string") return null;
  const t = ticker.trim().toUpperCase();

  if (OVERRIDES[t]) return OVERRIDES[t];

  const cacheKey = `cgid:${t}:${(projectName || "").slice(0, 40)}`;
  const cached = cache.get<string | null>(cacheKey);
  if (typeof cached !== "undefined") return cached;

  try {
    const { data } = await axios.get(COINGECKO_SEARCH, {
      params: { query: t },
      timeout: 10000,
    });
    const coins: Array<{ id: string; symbol: string; name: string }> =
      data?.coins || [];

    const symbolMatch = coins.find(
      (c) => c.symbol && c.symbol.toLowerCase() === t.toLowerCase()
    );
    if (symbolMatch) {
      cache.set(cacheKey, symbolMatch.id);
      return symbolMatch.id;
    }

    if (projectName?.trim()) {
      const n = projectName.toLowerCase();
      const exact = coins.find((c) => c.name?.toLowerCase() === n);
      if (exact) {
        cache.set(cacheKey, exact.id);
        return exact.id;
      }
      const partial = coins.find(
        (c) =>
          c.name?.toLowerCase().includes(n) || c.symbol?.toLowerCase() === n
      );
      if (partial) {
        cache.set(cacheKey, partial.id);
        return partial.id;
      }
    }

    if (coins.length > 0) {
      cache.set(cacheKey, coins[0].id);
      return coins[0].id;
    }

    cache.set(cacheKey, null);
    return null;
  } catch {
    cache.set(cacheKey, null, 60 * 5);
    return null;
  }
}

/** Fast check for known mappings */
export function hasCoinGeckoMapping(ticker: string): boolean {
  return !!OVERRIDES[ticker?.toUpperCase()];
}

/** Simple UI helper */
export function getTokenDisplayInfo(
  ticker: string,
  _projectName?: string
): { coingeckoId: string | null; hasPriceData: boolean } {
  const id = OVERRIDES[ticker?.toUpperCase()] || null;
  return { coingeckoId: id, hasPriceData: !!id };
}
