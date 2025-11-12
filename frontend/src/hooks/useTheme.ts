// src/hooks/useTheme.ts
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch } from "../redux/store";
import {
  selectTheme,
  selectIsDark,
  toggleTheme,
  setTheme,
} from "../redux/themeSlice";

export const useTheme = () => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useSelector(selectTheme);
  const isDark = useSelector(selectIsDark);

  const toggle = () => {
    dispatch(toggleTheme());
  };

  const setThemeMode = (mode: "light" | "dark") => {
    dispatch(setTheme(mode));
  };

  return {
    theme,
    isDark,
    toggle,
    setTheme: setThemeMode,
  };
};
