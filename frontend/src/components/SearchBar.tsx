import React, { useState } from "react";

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

  const handleSearch = () => {
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };

  const handleReset = () => {
    setInputValue("");
    onReset();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
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
        <span className="px-4 py-2 bg-[#1A2238] border border-white/10 rounded-xl text-gray-400 text-sm">
          {totalTokens} tokens
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <input
            type="text"
            className="w-80 px-4 py-3 bg-[#1A2238] border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search tokens by name or ticker..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
          />
          <span className="absolute right-4 text-gray-400">🔍</span>
        </div>

        <button
          onClick={handleSearch}
          disabled={isSearching || !inputValue.trim()}
          className="px-6 py-3 bg-linear-to-r from-green-600 to-green-500 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSearching ? (
            <>
              <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
              Searching...
            </>
          ) : (
            <>🔍 Search</>
          )}
        </button>

        <button
          onClick={handleReset}
          disabled={isSearching}
          className="px-6 py-3 bg-linear-to-r from-gray-700 to-gray-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
