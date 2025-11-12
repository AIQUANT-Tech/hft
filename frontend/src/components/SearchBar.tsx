// src/components/SearchBar.tsx

import { useState, useEffect, useRef } from "react";

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
      <div className="flex items-center gap-5">
        <button
          className="flex items-center gap-2 bg-linear-to-r from-[#0033AD] to-[#00A3FF] text-white font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-lg hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
              Refreshing...
            </>
          ) : (
            <>🔄 Refresh Data</>
          )}
        </button>
        <span className="px-4 py-2 bg-gray-200 dark:bg-[#1A2238] border border-gray-300 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-400 text-sm">
          {totalTokens} tokens
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <input
            type="text"
            className="w-80 px-4 py-3 bg-gray-100 dark:bg-[#1A2238] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search tokens (real-time)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSearching}
          />
          <span className="absolute right-4 text-gray-500 dark:text-gray-400">
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
            ) : (
              "🔍"
            )}
          </span>
        </div>

        <button
          onClick={handleReset}
          disabled={isSearching || !inputValue}
          className="px-6 py-3 bg-linear-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↺ Clear
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
