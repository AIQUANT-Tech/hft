// src/redux/themeSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
}

// Helper function to get initial theme
const getInitialTheme = (): ThemeMode => {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      return stored as ThemeMode;
    }
    // Check system preference
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  } catch {
    return "light";
  }
};

const initialState: ThemeState = {
  mode: getInitialTheme(),
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
      try {
        localStorage.setItem("theme", action.payload);
        // Update DOM immediately
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          if (action.payload === "dark") {
            root.classList.add("dark");
          } else {
            root.classList.remove("dark");
          }
        }
      } catch (error) {
        console.error("Failed to save theme:", error);
      }
    },
    toggleTheme: (state) => {
      const newMode = state.mode === "dark" ? "light" : "dark";
      state.mode = newMode;
      try {
        localStorage.setItem("theme", newMode);
        // Update DOM immediately
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          if (newMode === "dark") {
            root.classList.add("dark");
          } else {
            root.classList.remove("dark");
          }
        }
      } catch (error) {
        console.error("Failed to save theme:", error);
      }
    },
  },
});

// Selectors
export const selectTheme = (state: RootState & { theme: ThemeState }) =>
  state.theme.mode;
export const selectIsDark = (state: RootState & { theme: ThemeState }) =>
  state.theme.mode === "dark";

// Actions
export const { setTheme, toggleTheme } = themeSlice.actions;

export default themeSlice.reducer;
