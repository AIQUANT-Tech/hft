// src/components/StockCard.tsx

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { Token } from "../redux/tokensSlice";

interface StockCardProps {
  token: Token;
}

const StockCard: React.FC<StockCardProps> = ({ token }) => {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    document.body.style.overflow = showDetails ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showDetails]);

  const formatPrice = (price: string | number): string => {
    const priceNum = typeof price === "string" ? parseFloat(price) : price;
    if (!priceNum || priceNum === 0) return "N/A";
    return `₳${priceNum.toFixed(6)}`;
  };

  const formatTVL = (tvl: string | number): string => {
    const tvlNum = typeof tvl === "string" ? parseFloat(tvl) : tvl;
    if (!tvlNum || tvlNum === 0) return "N/A";
    return tvlNum.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const DetailsModal = () => {
    if (!showDetails) return null;
    return createPortal(
      <div
        className="fixed inset-0 z-50 bg-black/70 dark:bg-black/90 backdrop-blur-md animate-fadeIn"
        onClick={() => setShowDetails(false)}
        style={{
          width: "100vw",
          height: "100vh",
          margin: 0,
          padding: 0,
        }}
      >
        <div
          className="w-full h-full flex flex-col bg-white dark:bg-slate-900 animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 bg-linear-to-r from-blue-500 to-cyan-500 dark:from-slate-900 dark:to-slate-800 border-b border-blue-400/30 dark:border-white/10 px-4 sm:px-6 py-5 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 dark:bg-linear-to-r dark:from-[#0033AD] dark:to-[#00A3FF] backdrop-blur-sm flex items-center justify-center text-white font-bold border-2 border-white/30 shadow-lg">
                <span className="text-2xl">{token.symbol.charAt(0)}</span>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {token.symbol}
                </h2>
                <p className="text-sm text-white/80 dark:text-gray-400">
                  {token.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 dark:bg-red-500 dark:hover:bg-red-600 text-white font-semibold rounded-xl transition-all hover:scale-105 backdrop-blur-sm flex items-center gap-2 shadow-lg"
            >
              <span className="text-xl">✕</span>
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>

          {/* Details Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-linear-to-br from-gray-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-800">
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Price Info Card */}
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  Price Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-5 border border-green-200 dark:border-green-500/30">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">
                      Current Price
                    </p>
                    <p className="text-3xl font-black text-green-600 dark:text-green-400">
                      {formatPrice(token.priceAda)}
                    </p>
                  </div>
                  <div className="bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-5 border border-blue-200 dark:border-blue-500/30">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">
                      Liquidity TVL
                    </p>
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                      ₳{formatTVL(token.liquidityTvl)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Token Details Card */}
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <span className="text-2xl">🔖</span>
                  Token Details
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">
                      Policy ID
                    </p>
                    <div
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => {
                        navigator.clipboard.writeText(token.policyId);
                        toast.success("Policy ID copied!");
                      }}
                    >
                      <p className="text-gray-900 dark:text-white font-mono text-sm break-all group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">
                        {token.policyId}
                      </p>
                      <span className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-lg">
                        📋
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">
                      Asset Name
                    </p>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {token.assetName || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">
                      Pool ID
                    </p>
                    <p className="text-gray-900 dark:text-white font-mono text-sm break-all">
                      {token.poolId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pool Info Card */}
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <span className="text-2xl">🔄</span>
                  Pool Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">
                      DEX Source
                    </p>
                    <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold text-sm shadow-md">
                      {token.dexSource}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">
                      Last Updated
                    </p>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      {formatDate(token.lastUpdated)}
                    </p>
                  </div>
                </div>
              </div>

              {/* View on Explorer Button */}
              <a
                href={`https://preprod.cardanoscan.io/token/${token.policyId}${token.assetName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-2xl hover:scale-105 transition-all text-center shadow-xl shadow-blue-500/30"
              >
                <span className="text-xl mr-2">🔍</span>
                View on Cardanoscan
              </a>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer flex flex-col h-full overflow-hidden">
        {/* Header with gradient accent */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 p-4 sm:p-5 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 shrink-0 group-hover:scale-110 transition-transform">
              <span className="text-xl">{token.symbol.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {token.symbol}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm truncate">
                {token.name}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5 space-y-4">
          {/* Policy ID */}
          <div
            className="text-xs text-gray-500 dark:text-gray-500 font-mono truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-100 dark:bg-slate-800/50 px-3 py-2 rounded-lg"
            title={token.policyId}
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(token.policyId);
              toast.success("Policy ID copied!");
            }}
          >
            📋 {token.policyId.substring(0, 16)}...
          </div>

          {/* Price & Liquidity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-3 border border-green-200 dark:border-green-500/30">
              <span className="text-gray-600 dark:text-gray-400 text-xs block mb-1">
                Price (ADA)
              </span>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 truncate">
                {formatPrice(token.priceAda)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-3 border border-blue-200 dark:border-blue-500/30">
              <span className="text-gray-600 dark:text-gray-400 text-xs block mb-1">
                Liquidity
              </span>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 truncate">
                ₳{formatTVL(token.liquidityTvl)}
              </p>
            </div>
          </div>

          {/* DEX Source */}
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              Source:
            </span>
            <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md">
              {token.dexSource}
            </span>
          </div>

          {/* Last Updated */}
          <div className="text-xs text-gray-500 dark:text-gray-500 text-center bg-gray-100 dark:bg-slate-800/50 py-2 rounded-lg">
            🕒 {formatDate(token.lastUpdated)}
          </div>
        </div>

        {/* View Details Button */}
        <div className="p-4 sm:p-5 pt-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(true);
            }}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-blue-500/30"
          >
            View Details →
          </button>
        </div>
      </div>
      <DetailsModal />
    </>
  );
};

export default StockCard;
