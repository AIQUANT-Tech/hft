import React, { useState, useEffect, useMemo } from "react";
import StockCard from "./components/StockCard";
import SearchBar from "./components/SearchBar";
import WalletConnect from "./components/WalletConnect";
import AITradingSignals from "./components/AITradingSignals";
import { BrowserWallet } from "@meshsdk/core";
import {
  fetchTokens,
  searchTokens,
  selectTokens,
  selectTokensLoading,
  selectTokensError,
  selectVerifiedFilter,
  selectIsSearching,
  selectSearchQuery,
  setVerifiedFilter,
  resetSearch,
  type Token,
} from "./redux/tokensSlice";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch, RootState } from "./redux/store";
import { ConnectWallet } from "./redux/walletSlice";

export const WalletContext = React.createContext<BrowserWallet | null>(null);

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { walletId } = useSelector((state: RootState) => state.wallet);

  // Redux state
  const tokens = useSelector(selectTokens);
  const loading = useSelector(selectTokensLoading);
  const error = useSelector(selectTokensError);
  const showVerifiedOnly = useSelector(selectVerifiedFilter);
  const isSearching = useSelector(selectIsSearching);
  const searchQuery = useSelector(selectSearchQuery);

  // Local state
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);

  // Client-side pagination
  const itemsPerPage = 12;
  const [localPage, setLocalPage] = useState(1);

  // Fetch tokens on mount and filter change
  useEffect(() => {
    if (!searchQuery) {
      dispatch(fetchTokens({ onlyVerified: showVerifiedOnly }));
    }
  }, [dispatch, showVerifiedOnly, searchQuery]);

  // Reconnect wallet
  useEffect(() => {
    reconnectWallet();
  }, [walletId]);

  const reconnectWallet = async () => {
    if (!walletId) {
      setWallet(null);
      return;
    }

    try {
      const availableWallets = await BrowserWallet.getAvailableWallets();
      const selectedWallet = availableWallets.find(
        (wallet) => wallet.id === walletId
      );

      if (!selectedWallet) {
        console.warn(`Wallet with ID ${walletId} not found.`);
        setWallet(null);
        return;
      }

      const connectedWallet = await BrowserWallet.enable(walletId);
      const address = (await connectedWallet.getChangeAddress()) || "N/A";
      // Get Only native balance ADA
      const balances = await connectedWallet.getBalance();
      const lovelaceAsset = balances.find((asset) => asset.unit === "lovelace");
      const adaBalance =
        lovelaceAsset && lovelaceAsset.quantity
          ? Number(lovelaceAsset.quantity) / 1_000_000
          : 0;

      setWallet(connectedWallet);
      dispatch(
        ConnectWallet({
          walletId,
          address: address,
          BalanceAda: adaBalance.toString(),
        })
      );
      console.log("Wallet reconnected successfully");
    } catch (err: unknown) {
      console.error("Failed to reconnect wallet:", err);
      setWallet(null);
    }
  };

  // Calculate stats
  const verifiedCount = useMemo(
    () => tokens.filter((t) => t.is_verified).length,
    [tokens]
  );
  const unverifiedCount = useMemo(
    () => tokens.filter((t) => !t.is_verified).length,
    [tokens]
  );

  // Calculate pagination
  const totalPages = Math.ceil(tokens.length / itemsPerPage);
  const currentTokens = useMemo(() => {
    const startIndex = (localPage - 1) * itemsPerPage;
    return tokens.slice(startIndex, startIndex + itemsPerPage);
  }, [tokens, localPage, itemsPerPage]);

  // Reset page on filter change or search
  useEffect(() => {
    setLocalPage(1);
  }, [showVerifiedOnly, searchQuery]);

  // Handle search
  const handleSearch = (query: string) => {
    dispatch(searchTokens({ query, onlyVerified: showVerifiedOnly }));
  };

  // Handle reset
  const handleReset = () => {
    dispatch(resetSearch());
    dispatch(fetchTokens({ onlyVerified: showVerifiedOnly }));
  };

  // Refresh data
  const refreshData = () => {
    if (searchQuery) {
      dispatch(
        searchTokens({ query: searchQuery, onlyVerified: showVerifiedOnly })
      );
    } else {
      dispatch(fetchTokens({ onlyVerified: showVerifiedOnly }));
    }
  };

  // Toggle filter
  const handleFilterToggle = (verifiedOnly: boolean) => {
    dispatch(setVerifiedFilter(verifiedOnly));
    dispatch(resetSearch());
  };

  // Pagination handlers
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

  // Loading state
  if (loading && tokens.length === 0 && !searchQuery) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="text-center mb-10 p-10 bg-linear-to-r from-[#0033AD] to-[#00A3FF] rounded-3xl relative overflow-hidden border border-white/10 shadow-2xl">
          <h1 className="text-5xl font-black mb-4 bg-clip-text text-transparent bg-linear-to-r from-white to-blue-100">
            Cardano HFT Dashboard
          </h1>
          <p className="text-xl text-white/80 font-light">
            High-Frequency Trading with Minswap Aggregator
          </p>
        </header>
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-xl">
          <div className="w-12 h-12 border-4 border-transparent border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p>
            Loading {showVerifiedOnly ? "verified" : "all"} tokens from
            Minswap...
          </p>
        </div>
      </div>
    );
  }

  return (
    <WalletContext.Provider value={wallet}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="text-center mb-10 p-10 bg-linear-to-r from-[#0033AD] to-[#00A3FF] rounded-3xl relative overflow-hidden border border-white/10 shadow-2xl">
          <div className="flex justify-between items-center flex-wrap gap-6">
            <div className="text-left">
              <h1 className="text-5xl font-black mb-4 bg-clip-text text-transparent bg-linear-to-r from-white to-blue-100">
                Cardano HFT Dashboard
              </h1>
              <p className="text-xl text-white/80 font-light">
                High-Frequency Trading with Minswap Aggregator
              </p>
              {tokens.length > 0 && (
                <div className="text-sm text-white/60 mt-2 space-y-1">
                  <p>
                    ✅ {tokens.length} tokens{" "}
                    {searchQuery && `(search: "${searchQuery}")`} • Page{" "}
                    {localPage}/{totalPages}
                  </p>
                  <p className="text-xs">
                    {verifiedCount} verified • {unverifiedCount} unverified
                  </p>
                </div>
              )}
            </div>
            <WalletConnect />
          </div>
        </header>

        {error && (
          <div className="text-center p-5 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
            <p className="font-semibold mb-2">⚠️ Error</p>
            <p className="text-sm">{error}</p>
            <button
              className="mt-4 px-6 py-2 bg-red-500 text-white font-semibold rounded-lg transition-all hover:bg-red-400 hover:scale-105 active:scale-95"
              onClick={refreshData}
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter Toggle */}
        <div className="mb-6 flex gap-2 bg-slate-800/50 rounded-lg p-1 border border-white/10 w-fit">
          <button
            onClick={() => handleFilterToggle(true)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              showVerifiedOnly
                ? "bg-blue-500 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            ✓ Verified Only
          </button>
          <button
            onClick={() => handleFilterToggle(false)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              !showVerifiedOnly
                ? "bg-blue-500 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🌐 All Tokens
          </button>
        </div>

        {/* Search Bar */}
        <SearchBar
          onSearch={handleSearch}
          onReset={handleReset}
          onRefresh={refreshData}
          isSearching={isSearching}
          isRefreshing={loading}
          totalTokens={tokens.length}
        />

        {/* AI Trading Signals */}
        {tokens.length > 0 && (
          <AITradingSignals
            tokens={tokens}
            onTokenSelect={(token) => {
              setSelectedToken(token);
              // Scroll to the token card
              const element = document.getElementById(
                `token-${token.token_id}`
              );
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
          />
        )}

        {currentTokens.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl mb-4">
              {searchQuery
                ? `No tokens found for "${searchQuery}"`
                : "No tokens available"}
            </p>
            {searchQuery && (
              <button
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-all"
                onClick={handleReset}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
              {currentTokens.map((token) => (
                <div
                  key={token.token_id}
                  id={`token-${token.token_id}`}
                  className={`transition-all duration-300 rounded-2xl cursor-pointer ${
                    selectedToken?.token_id === token.token_id
                      ? "ring-4 ring-blue-500 scale-105 shadow-2xl"
                      : "hover:scale-105 hover:shadow-xl"
                  }`}
                  onClick={() => setSelectedToken(token)}
                >
                  <StockCard token={token} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-10 flex-wrap">
                <button
                  onClick={handlePreviousPage}
                  disabled={localPage === 1}
                  className="px-6 py-3 bg-linear-to-r from-gray-700 to-gray-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
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
                            ? "bg-linear-to-r from-[#0033AD] to-[#00A3FF] text-white scale-110"
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
                  className="px-6 py-3 bg-linear-to-r from-[#0033AD] to-[#00A3FF] text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
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
    </WalletContext.Provider>
  );
}

export default App;
