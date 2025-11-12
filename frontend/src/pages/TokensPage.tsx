// src/pages/TokensPage.tsx

import { useState, useEffect, useMemo } from "react";
import StockCard from "../components/StockCard";
import SearchBar from "../components/SearchBar";
import {
  fetchTokens,
  searchTokens,
  selectTokens,
  selectTokensLoading,
  selectTokensError,
  selectIsSearching,
  selectSearchQuery,
  resetSearch,
  type Token,
} from "../redux/tokensSlice";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch } from "../redux/store";

export default function TokensPage() {
  const dispatch = useDispatch<AppDispatch>();

  const tokens = useSelector(selectTokens);
  const loading = useSelector(selectTokensLoading);
  const error = useSelector(selectTokensError);
  const isSearching = useSelector(selectIsSearching);
  const searchQuery = useSelector(selectSearchQuery);

  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const itemsPerPage = 12;
  const [localPage, setLocalPage] = useState(1);

  useEffect(() => {
    dispatch(fetchTokens({ page: 1, count: 100, offset: 0 }));
  }, [dispatch]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      dispatch(searchTokens({ query: query.trim() }));
      setLocalPage(1);
    } else {
      handleReset();
    }
  };

  const handleReset = () => {
    dispatch(resetSearch());
    dispatch(fetchTokens({ page: 1, count: 100, offset: 0 }));
    setLocalPage(1);
  };

  const refreshData = () => {
    if (searchQuery) {
      dispatch(searchTokens({ query: searchQuery }));
    } else {
      dispatch(fetchTokens({ page: 1, count: 100, offset: 0 }));
    }
    setLocalPage(1);
  };

  const totalPages = Math.ceil(tokens.length / itemsPerPage);
  const currentTokens = useMemo(() => {
    const startIndex = (localPage - 1) * itemsPerPage;
    return tokens.slice(startIndex, startIndex + itemsPerPage);
  }, [tokens, localPage, itemsPerPage]);

  const handlePreviousPage = () => {
    if (localPage > 1) {
      setLocalPage(localPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    if (localPage < totalPages) {
      setLocalPage(localPage + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageClick = (pageNum: number) => {
    setLocalPage(pageNum);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading && tokens.length === 0 && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500 text-xl">
        <div className="w-12 h-12 border-4 border-transparent border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
        <p>Loading tokens from database...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="text-center p-5 text-red-400 dark:text-red-300 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 rounded-2xl mb-6">
          <p className="font-semibold mb-2">⚠️ Error</p>
          <p className="text-sm">{error}</p>
          <button
            className="mt-4 px-6 py-2 bg-red-500 dark:bg-red-600 text-white font-semibold rounded-lg transition-all hover:bg-red-400 dark:hover:bg-red-500 hover:scale-105 active:scale-95"
            onClick={refreshData}
          >
            Retry
          </button>
        </div>
      )}

      {/* ✅ Fixed gradient background for dark mode */}
      <div className="mb-6 p-6 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-gray-300 dark:border-white/10">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          💰 Token Explorer
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {tokens.length} tokens synced from Minswap V2 (Preprod)
        </p>
      </div>

      <SearchBar
        onSearch={handleSearch}
        onReset={handleReset}
        onRefresh={refreshData}
        isSearching={isSearching}
        isRefreshing={loading}
        totalTokens={tokens.length}
      />

      {currentTokens.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <p className="text-xl mb-4">
            {searchQuery
              ? `No tokens found for "${searchQuery}"`
              : "No tokens available. Sync pools first."}
          </p>
          {searchQuery ? (
            <button
              className="px-6 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-400 dark:hover:bg-blue-500 transition-all"
              onClick={handleReset}
            >
              Clear Search
            </button>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-600 mt-2">
              Run: curl -X POST http://localhost:8080/api/sync/pools
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
            {currentTokens.map((token) => (
              <div
                key={token.id}
                className={`transition-all duration-300 rounded-2xl cursor-pointer ${
                  selectedToken?.id === token.id
                    ? "ring-4 ring-blue-500 dark:ring-blue-400 scale-105 shadow-2xl"
                    : "hover:scale-105 hover:shadow-xl"
                }`}
                onClick={() => setSelectedToken(token)}
              >
                <StockCard token={token} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-10 flex-wrap">
              <button
                onClick={handlePreviousPage}
                disabled={localPage === 1}
                className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-600 dark:from-gray-800 dark:to-gray-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (localPage <= 3) {
                    pageNum = i + 1;
                  } else if (localPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = localPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageClick(pageNum)}
                      className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                        localPage === pageNum
                          ? "bg-gradient-to-r from-[#0033AD] to-[#00A3FF] text-white scale-110"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:scale-105"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleNextPage}
                disabled={localPage === totalPages}
                className="px-6 py-3 bg-gradient-to-r from-[#0033AD] to-[#00A3FF] text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
              >
                Next →
              </button>

              <span className="ml-4 text-gray-600 dark:text-gray-400">
                Page {localPage} of {totalPages}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
