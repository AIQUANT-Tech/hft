import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { Token } from "../redux/tokensSlice";
import PriceChart from "./PriceChart";
import { getTokenDisplayInfo } from "../utils/coingeckoMap";

interface StockCardProps {
  token: Token;
}

const StockCard: React.FC<StockCardProps> = ({ token }) => {
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    document.body.style.overflow = showChart ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showChart]);

  const formatPrice = (price: number): string => {
    if (!price || price === 0) return "N/A";
    return `₳${price.toString()}`;
  };

  const displayInfo = getTokenDisplayInfo(token.ticker, token.project_name);

  const ChartModal = () => {
    if (!showChart) return null;
    return createPortal(
      <div
        className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-sm"
        onClick={() => setShowChart(false)}
        style={{
          width: "100vw",
          height: "100vh",
          margin: 0,
          padding: 0,
        }}
      >
        {/* Full screen chart container */}
        <div
          className="w-full h-full flex flex-col bg-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Fixed at top */}
          <div className="shrink-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 px-4 sm:px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {token.logo ? (
                <img
                  src={token.logo}
                  alt={token.ticker}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/10"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      token.ticker
                    )}&background=0033AD&color=fff&bold=true&size=128`;
                  }}
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border-2 border-white/10">
                  {token.ticker.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {token.ticker} Price Chart
                </h2>
                <p className="text-xs sm:text-sm text-gray-400">
                  {token.project_name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowChart(false)}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm sm:text-base"
            >
              <span className="text-lg">✕</span>
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>

          {/* Chart content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="w-full h-full p-4 sm:p-6 lg:p-8">
              {displayInfo.hasPriceData ? (
                <PriceChart tokenId={displayInfo.coingeckoId!} days={30} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-gray-400 text-center py-10 max-w-md">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-xl font-semibold mb-2">
                      No CoinGecko Data Available
                    </p>
                    <p className="text-sm text-gray-500">
                      This token ({token.ticker}) is not listed on CoinGecko
                      yet. Historical price data is unavailable.
                    </p>
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-300">
                        <strong>Current Minswap Price:</strong>{" "}
                        {formatPrice(token.price_by_ada)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className="glass-card p-4 sm:p-6 transition-all duration-300 hover:scale-105 cursor-pointer flex flex-col bg-linear-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-lg h-full">
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          {token.logo ? (
            <img
              src={token.logo}
              alt={token.ticker}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/10 shrink-0"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  token.ticker
                )}&background=0033AD&color=fff&bold=true&size=128`;
              }}
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border-2 border-white/10 shrink-0">
              {token.ticker.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-lg sm:text-xl font-bold text-white truncate">
              {token.ticker}
            </div>
            <div className="text-gray-400 text-xs sm:text-sm truncate">
              {token.project_name}
            </div>
            {token.is_verified && (
              <span className="inline-flex items-center text-xs text-green-400 mt-1">
                ✓ Verified
              </span>
            )}
          </div>
        </div>

        <div
          className="text-xs text-gray-500 mb-3 font-mono truncate cursor-pointer hover:text-blue-400 transition-colors"
          title={token.token_id}
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(token.token_id);
            toast.success("Policy ID copied to clipboard", {
              closeButton: true,
            });
          }}
        >
          Policy: {token.token_id.substring(0, 12)}...
        </div>

        <div className="flex-1 space-y-3 my-3 sm:my-4 border-y border-white/10 py-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400 text-xs sm:text-sm">
                Price (ADA):
              </span>
              <p className="text-base sm:text-lg font-bold text-blue-400 mt-1 break-all">
                {formatPrice(token.price_by_ada)}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-xs sm:text-sm">
                Decimals:
              </span>
              <p className="text-base sm:text-lg font-bold text-green-400 mt-1">
                {token.decimals}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Source:</span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 text-xs">
              Minswap
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!displayInfo.hasPriceData) {
                toast.error(
                  `📊 ${token.ticker} - No price history on CoinGecko.`,
                  { closeButton: true }
                );
                return;
              }
              setShowChart(true);
            }}
            disabled={!displayInfo.hasPriceData}
            className={`w-full mt-3 px-4 py-2 sm:py-3 font-semibold rounded-lg hover:scale-105 transition-all shadow-lg text-sm sm:text-base ${
              displayInfo.hasPriceData
                ? "bg-linear-to-r from-[#0033AD] to-[#00A3FF] text-white"
                : "bg-linear-to-r from-gray-700 to-gray-600 text-gray-300 cursor-not-allowed opacity-60"
            }`}
          >
            📊{" "}
            {displayInfo.hasPriceData ? "View Price Chart" : "No History Data"}
          </button>
        </div>
      </div>
      <ChartModal />
    </>
  );
};

export default StockCard;
