import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";

import axios from "axios";

const API_URL = "http://localhost:8080";

interface PortfolioData {
  // define exact types if available, otherwise use 'any'
  portfolio: any;
  holdings: any[];
  strategies: any[];
  activities: any[];
  history: any[];
}

interface DashboardState {
  data: PortfolioData | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  data: null,
  loading: false,
  error: null,
};

// Async thunk to fetch dashboard data
export const fetchDashboardData = createAsyncThunk<
  PortfolioData,
  void,
  { rejectValue: string }
>("dashboard/fetchDashboardData", async (_, thunkAPI) => {
  try {
    const response = await axios.get(`${API_URL}/api/dashboard`, {
      withCredentials: true,
    });

    if (response.data.success) {
      return response.data.data as PortfolioData;
    } else {
      return thunkAPI.rejectWithValue("Failed to load dashboard data");
    }
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.error || "Failed to load dashboard data"
    );
  }
});

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboardData(state) {
      state.data = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchDashboardData.fulfilled,
        (state, action: PayloadAction<PortfolioData>) => {
          state.data = action.payload;
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch data";
      });
  },
});

export const { clearDashboardData } = dashboardSlice.actions;

export default dashboardSlice.reducer;

// Selectors
export const selectDashboardData = (state: any) => state.dashboard.data;
export const selectDashboardLoading = (state: any) => state.dashboard.loading;
export const selectDashboardError = (state: any) => state.dashboard.error;
