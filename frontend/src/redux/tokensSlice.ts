// src/store/slices/token.slice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

// ✅ Updated interface to match your DB response
export interface Token {
  id: number;
  poolId: string;
  symbol: string;
  name: string;
  policyId: string;
  assetName: string;
  priceAda: string;
  liquidityTvl: string;
  assetA: string;
  assetB: string;
  dexSource: string;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

interface TokensState {
  tokens: Token[];
  loading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  isSearching: boolean;
  searchQuery: string;
  // ✅ Pagination state
  currentPage: number;
  totalOnPage: number;
  hasMore: boolean;
}

const initialState: TokensState = {
  tokens: [],
  loading: false,
  error: null,
  lastFetchTime: null,
  isSearching: false,
  searchQuery: "",
  currentPage: 1,
  totalOnPage: 0,
  hasMore: true,
};

/**
 * ✅ Fetch tokens from local database (paginated)
 */
export const fetchTokens = createAsyncThunk(
  "tokens/fetchTokens",
  async (
    _params: {
      page?: number;
      count?: number;
      offset?: number;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tokens`, {});

      const tokenCount = response.data.count || 0;
      console.log(`✅ Fetched ${tokenCount} tokens from database`);

      return response.data;
    } catch (error: any) {
      console.error("❌ Failed to fetch tokens:", error);
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch tokens"
      );
    }
  }
);

/**
 * ✅ Search tokens in local database
 */
export const searchTokens = createAsyncThunk(
  "tokens/searchTokens",
  async (params: { query: string }, { rejectWithValue }) => {
    try {
      const { query } = params;

      console.log(`🔍 Searching tokens: "${query}"`);

      // Search by symbol or name
      const response = await axios.get(`${API_BASE_URL}/api/tokens`, {
        params: { page: 1, count: 100, offset: 0 },
      });

      // Filter results locally (or add a search endpoint to backend)
      const allTokens = response.data.data || [];
      const filteredTokens = allTokens.filter(
        (token: Token) =>
          token.symbol.toLowerCase().includes(query.toLowerCase()) ||
          token.name.toLowerCase().includes(query.toLowerCase()) ||
          token.policyId.toLowerCase().includes(query.toLowerCase())
      );

      console.log(
        `✅ Search found ${filteredTokens.length} tokens for "${query}"`
      );

      return { data: filteredTokens, query };
    } catch (error: any) {
      console.error("❌ Failed to search tokens:", error);
      return rejectWithValue(
        error.response?.data?.error || "Failed to search tokens"
      );
    }
  }
);

/**
 * ✅ Load more tokens (pagination)
 */
export const loadMoreTokens = createAsyncThunk(
  "tokens/loadMoreTokens",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { tokens: TokensState };
      const { tokens, currentPage } = state.tokens;

      const nextOffset = tokens.length;
      const count = 100;

      console.log(
        `🔍 Loading more tokens: offset=${nextOffset}, count=${count}`
      );

      const response = await axios.get(`${API_BASE_URL}/api/tokens`, {
        params: { page: currentPage, count, offset: nextOffset },
      });

      console.log(`✅ Loaded ${response.data.count} more tokens`);

      return response.data;
    } catch (error: any) {
      console.error("❌ Failed to load more tokens:", error);
      return rejectWithValue(
        error.response?.data?.error || "Failed to load more tokens"
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
      state.currentPage = 1;
      state.hasMore = true;
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
        state.totalOnPage = action.payload.totalOnPage || 0;
        state.currentPage = action.payload.page || 1;
        state.hasMore = (action.payload.data || []).length === 100; // More if we got full page
        state.lastFetchTime = Date.now();
        state.searchQuery = "";
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
        state.tokens = action.payload.data;
        state.searchQuery = action.payload.query;
        state.lastFetchTime = Date.now();
        state.hasMore = false; // Search shows all results
      })
      .addCase(searchTokens.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.payload as string;
      });

    // loadMoreTokens
    builder
      .addCase(loadMoreTokens.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadMoreTokens.fulfilled, (state, action) => {
        state.loading = false;
        const newTokens = action.payload.data || [];
        state.tokens = [...state.tokens, ...newTokens];
        state.hasMore = newTokens.length === 100;
      })
      .addCase(loadMoreTokens.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTokens, resetSearch } = tokensSlice.actions;

export const selectTokens = (state: { tokens: TokensState }) =>
  state.tokens.tokens;
export const selectTokensLoading = (state: { tokens: TokensState }) =>
  state.tokens.loading;
export const selectTokensError = (state: { tokens: TokensState }) =>
  state.tokens.error;
export const selectIsSearching = (state: { tokens: TokensState }) =>
  state.tokens.isSearching;
export const selectSearchQuery = (state: { tokens: TokensState }) =>
  state.tokens.searchQuery;
export const selectHasMore = (state: { tokens: TokensState }) =>
  state.tokens.hasMore;
export const selectCurrentPage = (state: { tokens: TokensState }) =>
  state.tokens.currentPage;

export default tokensSlice.reducer;
