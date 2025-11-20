// src/components/SearchBar.tsx

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onReset: () => void;
  onRefresh: () => void;
  isSearching: boolean;
  isRefreshing: boolean;
  totalTokens: number;
}

const SearchBar = ({
  onSearch,
  onReset,
  onRefresh,
  isSearching,
  isRefreshing,
  totalTokens,
}: SearchBarProps) => {
  const [inputValue, setInputValue] = useState("");
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const isDark = useSelector(selectIsDark);

  // ✅ Search on every keypress with debouncing (300ms delay)
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // If input is empty, reset
    if (!inputValue.trim()) {
      onReset();
      return;
    }

    // Set new timeout for search
    debounceTimeout.current = setTimeout(() => {
      onSearch(inputValue.trim());
    }, 300); // 300ms delay

    // Cleanup on unmount
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [inputValue]); // Trigger on every input change

  const handleReset = () => {
    setInputValue("");
    onReset();
  };

  return (
    <div className="flex justify-between items-center mb-10 flex-wrap gap-5">
      {/* Left Section - Refresh Button & Token Count */}
      <div className="flex items-center gap-5">
        <button
          className={`flex items-center gap-2 font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-lg hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed ${
            isDark
              ? "bg-linear-to-br from-purple-500 to-pink-500"
              : "bg-linear-to-br from-blue-500 to-cyan-500"
          }`}
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
              Refreshing...
            </>
          ) : (
            <span className={`${isDark ? "text-white" : "text-gray-900"}`}>
              🔄 Refresh Data
            </span>
          )}
        </button>

        <span
          className={`px-4 py-2 rounded-xl text-sm border ${
            isDark
              ? "bg-slate-800 border-white/10 text-gray-300"
              : "bg-gray-100 border-gray-300 text-gray-700"
          }`}
        >
          {totalTokens} tokens
        </span>
      </div>

      {/* Right Section - Search Bar & Clear Button */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <input
            type="text"
            className={`w-80 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border transition-all ${
              isDark
                ? "bg-slate-800 border-white/10 text-white placeholder-gray-400"
                : "bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500"
            }`}
            placeholder="Search tokens (real-time)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSearching}
          />
          <span
            className={`absolute right-4 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {isSearching ? (
              <div
                className={`w-4 h-4 border-2 border-transparent rounded-full animate-spin ${
                  isDark ? "border-t-blue-400" : "border-t-blue-500"
                }`}
              ></div>
            ) : (
              "🔍"
            )}
          </span>
        </div>

        <button
          onClick={handleReset}
          disabled={isSearching || !inputValue}
          className={`px-6 py-3 font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark
              ? "bg-linear-to-br from-purple-500 to-pink-500 text-white"
              : "bg-linear-to-br from-blue-500 to-cyan-500"
          }`}
        >
          ↺ Clear
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
