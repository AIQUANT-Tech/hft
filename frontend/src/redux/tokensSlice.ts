import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export interface Token {
  token_id: string;
  logo: string;
  ticker: string;
  is_verified: boolean;
  price_by_ada: number;
  project_name: string;
  decimals: number;
}

interface TokensState {
  tokens: Token[];
  loading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  showVerifiedOnly: boolean;
  isSearching: boolean; // ✅ Track search state separately
  searchQuery: string; // ✅ Current search query
}

const initialState: TokensState = {
  tokens: [],
  loading: false,
  error: null,
  lastFetchTime: null,
  showVerifiedOnly: true,
  isSearching: false,
  searchQuery: "",
};

/**
 * Fetch tokens (one page) - for refresh/filter
 */
export const fetchTokens = createAsyncThunk(
  "tokens/fetchTokens",
  async (
    params: {
      onlyVerified?: boolean;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const { onlyVerified = true } = params;

      const response = await axios.post(
        `${API_BASE_URL}/api/aggregator/search-tokens`,
        {
          query: "",
          only_verified: onlyVerified,
        }
      );

      const tokenCount = response.data.count || 0;
      const tokenType = onlyVerified ? "verified" : "all";
      console.log(`✅ Fetched ${tokenCount} ${tokenType} tokens`);

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch tokens"
      );
    }
  }
);

/**
 * Search tokens by query - NEW: API-based search
 */
export const searchTokens = createAsyncThunk(
  "tokens/searchTokens",
  async (
    params: { query: string; onlyVerified?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const { query, onlyVerified = false } = params;

      const response = await axios.post(
        `${API_BASE_URL}/api/aggregator/search-tokens`,
        {
          query,
          only_verified: onlyVerified,
        }
      );

      console.log(
        `✅ Search found ${response.data.count} tokens for "${query}"`
      );

      return { data: response.data, query };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to search tokens"
      );
    }
  }
);

const tokensSlice = createSlice({
  name: "tokens",
  initialState,
  reducers: {
    clearTokens: (state) => {
      state.tokens = [];
      state.error = null;
      state.searchQuery = "";
    },
    setVerifiedFilter: (state, action: PayloadAction<boolean>) => {
      state.showVerifiedOnly = action.payload;
    },
    resetSearch: (state) => {
      state.searchQuery = "";
    },
  },
  extraReducers: (builder) => {
    // fetchTokens
    builder
      .addCase(fetchTokens.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTokens.fulfilled, (state, action) => {
        state.loading = false;
        state.tokens = action.payload.data || [];
        state.lastFetchTime = Date.now();
        state.searchQuery = ""; // Clear search on fetch
      })
      .addCase(fetchTokens.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.tokens = [];
      });

    // searchTokens
    builder
      .addCase(searchTokens.pending, (state) => {
        state.isSearching = true;
        state.error = null;
      })
      .addCase(searchTokens.fulfilled, (state, action) => {
        state.isSearching = false;
        state.tokens = action.payload.data.data || [];
        state.searchQuery = action.payload.query;
        state.lastFetchTime = Date.now();
      })
      .addCase(searchTokens.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTokens, setVerifiedFilter, resetSearch } =
  tokensSlice.actions;

export const selectTokens = (state: { tokens: TokensState }) =>
  state.tokens.tokens;
export const selectTokensLoading = (state: { tokens: TokensState }) =>
  state.tokens.loading;
export const selectTokensError = (state: { tokens: TokensState }) =>
  state.tokens.error;
export const selectVerifiedFilter = (state: { tokens: TokensState }) =>
  state.tokens.showVerifiedOnly;
export const selectIsSearching = (state: { tokens: TokensState }) =>
  state.tokens.isSearching;
export const selectSearchQuery = (state: { tokens: TokensState }) =>
  state.tokens.searchQuery;

export default tokensSlice.reducer;
