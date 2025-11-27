import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "./store"; // ✅ Add this for selectors

const API_URL = import.meta.env.VITE_SERVER_URL;

export interface PricePoint {
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
  history?: PricePoint[];
}

interface PriceState {
  currentToken: TokenPriceData | null;
  priceHistory: PricePoint[];
  loading: boolean;
  error: string | null;
}

const initialState: PriceState = {
  currentToken: null,
  priceHistory: [],
  loading: false,
  error: null,
};

export const fetchTokenPriceHistory = createAsyncThunk(
  "price/fetchHistory",
  async (params: { tokenId: string; days?: number }, { rejectWithValue }) => {
    try {
      const { tokenId, days = 30 } = params;
      const response = await axios.get(
        `${API_URL}/api/price-history/${tokenId}?days=${days}`
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch price history"
      );
    }
  }
);

const priceSlice = createSlice({
  name: "price",
  initialState,
  reducers: {
    clearPrice: (state) => {
      state.currentToken = null;
      state.priceHistory = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTokenPriceHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTokenPriceHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.currentToken = action.payload;
        state.priceHistory = action.payload.history || [];
      })
      .addCase(fetchTokenPriceHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.priceHistory = [];
      });
  },
});

export const { clearPrice } = priceSlice.actions;

// ✅ Selectors
export const selectCurrentToken = (state: RootState) =>
  state.price.currentToken;
export const selectPriceHistory = (state: RootState) =>
  state.price.priceHistory;
export const selectPriceLoading = (state: RootState) => state.price.loading;
export const selectPriceError = (state: RootState) => state.price.error;

export default priceSlice.reducer;
