import axios from "axios";
import Big from "big.js";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
  marketCap?: number;
  volume?: number;
}

export interface TokenPriceData {
  token_id: string;
  ticker: string;
  price_by_ada: number;
  market_cap?: number;
  volume_24h?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  high_24h?: number;
  low_24h?: number;
  ath?: number;
  atl?: number;
  history?: PriceHistoryPoint[];
}

export class PriceHistoryService {
  /**
   * Get token price data from CoinGecko (includes history)
   */

  async getTokenPriceData(
    tokenId: string,
    days: number = 30
  ): Promise<TokenPriceData> {
    try {
      // Get current data + market data
      const currentResponse = await axios.get(
        `${COINGECKO_API}/coins/${tokenId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
      );

      const data = currentResponse.data;

      // Get historical data (last N days)
      const historicalResponse = await axios.get(
        `${COINGECKO_API}/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
      );

      const prices = historicalResponse.data.prices;
      const marketCaps = historicalResponse.data.market_caps;
      const volumes = historicalResponse.data.total_volumes;

      // Convert to price history
      const history: PriceHistoryPoint[] = prices.map(
        (price: any[], index: number) => ({
          timestamp: price[0],
          price: price[1],
          marketCap: marketCaps[index]?.[1],
          volume: volumes[index]?.[1],
        })
      );

      return {
        token_id: tokenId,
        ticker: data.symbol.toUpperCase(),
        price_by_ada: data.market_data?.current_price?.usd || 0,
        market_cap: data.market_data?.market_cap?.usd,
        volume_24h: data.market_data?.total_volume?.usd,
        price_change_24h: data.market_data?.price_change_24h,
        price_change_percentage_24h:
          data.market_data?.price_change_percentage_24h,
        high_24h: data.market_data?.high_24h?.usd,
        low_24h: data.market_data?.low_24h?.usd,
        ath: data.market_data?.ath?.usd,
        atl: data.market_data?.atl?.usd,
        history,
      };
    } catch (error: any) {
      // Better error message
      if (error.response?.status === 404) {
        throw new Error(`Token "${tokenId}" not found on CoinGecko`);
      } else if (error.response?.status === 429) {
        throw new Error(
          "Rate limit exceeded. Please try again in a few minutes."
        );
      } else {
        throw new Error(`Failed to fetch price data for "${tokenId}"`);
      }
    }
  }

  /**
   * Get price history for multiple tokens
   */
  async getMultipleTokenPrices(
    tokenIds: string[],
    days: number = 30
  ): Promise<TokenPriceData[]> {
    try {
      const results = await Promise.all(
        tokenIds.map((id) => this.getTokenPriceData(id, days))
      );
      return results;
    } catch (error) {
      console.error("Error fetching multiple token prices:", error);
      throw error;
    }
  }

  /**
   * Get simple price change metrics
   */
  async getPriceMetrics(tokenId: string): Promise<{
    current_price: number;
    change_24h: number;
    change_percentage_24h: number;
    high_24h: number;
    low_24h: number;
  }> {
    try {
      const response = await axios.get(
        `${COINGECKO_API}/coins/${tokenId}?localization=false&tickers=false&market_data=true`
      );

      const data = response.data.market_data;

      return {
        current_price: data.current_price?.usd || 0,
        change_24h: data.price_change_24h || 0,
        change_percentage_24h: data.price_change_percentage_24h || 0,
        high_24h: data.high_24h?.usd || 0,
        low_24h: data.low_24h?.usd || 0,
      };
    } catch (error) {
      console.error(`Error fetching price metrics for ${tokenId}:`, error);
      throw error;
    }
  }
}

export const priceHistoryService = new PriceHistoryService();
