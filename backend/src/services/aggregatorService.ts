import axios from "axios";

const AGGREGATOR_API = "https://agg-api.minswap.org";

export interface TokenInfo {
  token_id: string;
  logo: string;
  ticker: string;
  is_verified: boolean;
  price_by_ada: number;
  project_name: string;
  decimals: number;
}

export interface SwapEstimate {
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out: string;
  min_amount_out: string;
  total_lp_fee: string;
  total_dex_fee: string;
  avg_price_impact: number;
  paths: Array<{
    pool_id: string;
    protocol: string;
    lp_token: string;
    token_in: string;
    token_out: string;
    amount_in: string;
    amount_out: string;
    lp_fee: string;
    dex_fee: string;
    price_impact: number;
  }>;
  aggregator_fee: string;
  aggregator_fee_percent: number;
}

export interface SwapTransaction {
  cbor: string;
}

export class AggregatorService {
  /**
   * Get ADA price in multiple currencies
   */
  async getAdaPrice(currency: string = "usd"): Promise<{
    currency: string;
    value: {
      price: number;
      change_24h: number;
    };
  }> {
    try {
      const response = await axios.get(
        `${AGGREGATOR_API}/aggregator/ada-price?currency=${currency}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching ADA price:", error);
      throw error;
    }
  }

  /**
   * Search and filter tokens (single page)
   */
  async searchTokens(
    query: string = "",
    onlyVerified: boolean = true
  ): Promise<{
    tokens: TokenInfo[];
    search_after: string[];
  }> {
    try {
      const response = await axios.post(`${AGGREGATOR_API}/aggregator/tokens`, {
        query,
        only_verified: onlyVerified,
      });

      return {
        tokens: response.data.tokens || [],
        search_after: response.data.search_after || [],
      };
    } catch (error) {
      console.error("Error searching tokens:", error);
      throw error;
    }
  }

  /**
   * Get optimal swap route and price estimation
   */
  async estimateSwap(params: {
    amount: string;
    token_in: string;
    token_out: string;
    slippage: number;
    allow_multi_hops?: boolean;
    amount_in_decimal?: boolean;
  }): Promise<SwapEstimate> {
    try {
      const response = await axios.post(
        `${AGGREGATOR_API}/aggregator/estimate`,
        {
          amount: params.amount,
          token_in: params.token_in,
          token_out: params.token_out,
          slippage: params.slippage,
          allow_multi_hops: params.allow_multi_hops ?? true,
          amount_in_decimal: params.amount_in_decimal ?? true,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error estimating swap:", error);
      throw error;
    }
  }

  /**
   * Build unsigned swap transaction
   */
  async buildSwapTransaction(params: {
    sender: string;
    min_amount_out: string;
    estimate: SwapEstimate;
    amount_in_decimal?: boolean;
  }): Promise<SwapTransaction> {
    try {
      const response = await axios.post(
        `${AGGREGATOR_API}/aggregator/build-tx`,
        {
          sender: params.sender,
          min_amount_out: params.min_amount_out,
          estimate: params.estimate,
          amount_in_decimal: params.amount_in_decimal ?? true,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error building swap transaction:", error);
      throw error;
    }
  }

  /**
   * Submit signed transaction
   */
  async submitSwapTransaction(params: {
    cbor: string;
    witness_set: string;
  }): Promise<{ tx_id: string }> {
    try {
      const response = await axios.post(
        `${AGGREGATOR_API}/aggregator/finalize-and-submit-tx`,
        {
          cbor: params.cbor,
          witness_set: params.witness_set,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error submitting swap transaction:", error);
      throw error;
    }
  }

  /**
   * Get pending swap orders for wallet
   */
  async getPendingOrders(
    walletAddress: string,
    amountInDecimal: boolean = true
  ): Promise<any[]> {
    try {
      const response = await axios.get(
        `${AGGREGATOR_API}/aggregator/pending-orders?owner_address=${walletAddress}&amount_in_decimal=${amountInDecimal}`
      );
      return response.data.orders;
    } catch (error) {
      console.error("Error fetching pending orders:", error);
      throw error;
    }
  }

  /**
   * Build transaction to cancel pending orders
   */
  async buildCancelTransaction(
    sender: string,
    orders: Array<{ tx_in: string; protocol: string }>
  ): Promise<SwapTransaction> {
    try {
      const response = await axios.post(
        `${AGGREGATOR_API}/aggregator/cancel-tx`,
        {
          sender,
          orders,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error building cancel transaction:", error);
      throw error;
    }
  }
}

export const aggregatorService = new AggregatorService();
