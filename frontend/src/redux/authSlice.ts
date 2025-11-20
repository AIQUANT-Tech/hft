// src/redux/authSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "./store";

const API_URL = "http://localhost:8080/api";

interface User {
  id: number;
  walletAddress: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  initialCheckDone: boolean; // ✅ Track if initial auth check is complete
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true, // ✅ Start with loading=true for initial check
  error: null,
  initialCheckDone: false,
};

// Async thunk: Connect wallet and authenticate
export const authConnect = createAsyncThunk(
  "auth/connect",
  async (walletAddress: string, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/connect`,
        { walletAddress },
        { withCredentials: true }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to authenticate"
      );
    }
  }
);

// ✅ Async thunk: Fetch current user (on app load)
export const fetchCurrentUser = createAsyncThunk(
  "auth/me",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch user"
      );
    }
  }
);

// ✅ Async thunk: Update profile
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (
    profileData: Partial<Omit<User, "id" | "walletAddress" | "createdAt">>,
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.put(`${API_URL}/auth/profile`, profileData, {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update profile"
      );
    }
  }
);

// ✅ Async thunk: Logout
export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
      return response.data;
    } catch (error: any) {
      console.log(error);
      return rejectWithValue(error.response?.data?.error || "Failed to logout");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Manual logout (for client-side only)
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.loading = false;
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Connect Wallet
    builder
      .addCase(authConnect.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(authConnect.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.initialCheckDone = true; // ✅ Mark check as done
      })
      .addCase(authConnect.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.initialCheckDone = true; // ✅ Mark check as done even on error
      });

    // Fetch Current User
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.initialCheckDone = true; // ✅ Mark check as done
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.initialCheckDone = true; // ✅ Mark check as done even on error
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearAuth, clearError } = authSlice.actions;

// ✅ Selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectInitialCheckDone = (state: RootState) =>
  state.auth.initialCheckDone; // ✅ New selector

export default authSlice.reducer;
