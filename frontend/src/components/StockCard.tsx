// src/components/StockCard.tsx

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";
import type { Token } from "../redux/tokensSlice";
import { formatPrice } from "@/utils/helper";

interface StockCardProps {
  token: Token;
}

const StockCard: React.FC<StockCardProps> = ({ token }) => {
  const [showDetails, setShowDetails] = useState(false);
  const isDark = useSelector(selectIsDark);

  useEffect(() => {
    document.body.style.overflow = showDetails ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showDetails]);

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
        className={`fixed inset-0 z-50 backdrop-blur-md animate-fadeIn ${
          isDark ? "bg-black/90" : "bg-black/70"
        }`}
        onClick={() => setShowDetails(false)}
        style={{
          width: "100vw",
          height: "100vh",
          margin: 0,
          padding: 0,
        }}
      >
        <div
          className={`w-full h-full flex flex-col animate-slideUp ${
            isDark ? "bg-slate-900" : "bg-white"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`shrink-0 px-4 sm:px-6 py-5 flex justify-between items-center shadow-lg border-b ${
              isDark
                ? "bg-linear-to-r from-purple-900 to-pink-900 border-white/10"
                : "bg-linear-to-r from-blue-500 to-cyan-500 border-blue-400/30"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold border-2 shadow-lg ${
                  isDark
                    ? "bg-linear-to-br from-purple-500 to-pink-500 border-purple-300/30"
                    : "bg-white/20 backdrop-blur-sm border-white/30"
                }`}
              >
                <span className="text-2xl">{token.symbol.charAt(0)}</span>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {token.symbol}
                </h2>
                <p
                  className={`text-sm ${
                    isDark ? "text-gray-300" : "text-white/80"
                  }`}
                >
                  {token.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className={`px-4 py-2.5 font-semibold rounded-xl transition-all hover:scale-105 backdrop-blur-sm flex items-center gap-2 shadow-lg ${
                isDark
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-white/20 hover:bg-white/30 text-white"
              }`}
            >
              <span className="text-xl">✕</span>
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>

          {/* Details Content */}
          <div
            className={`flex-1 overflow-y-auto p-4 sm:p-6 ${
              isDark
                ? "bg-linear-to-br from-slate-900 to-slate-800"
                : "bg-linear-to-br from-gray-50 to-blue-50/30"
            }`}
          >
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Price Info Card */}
              <div
                className={`rounded-2xl p-6 shadow-lg border ${
                  isDark
                    ? "bg-slate-800/50 border-white/10"
                    : "bg-white border-gray-200"
                }`}
              >
                <h3
                  className={`text-lg font-bold mb-5 flex items-center gap-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  <span className="text-2xl">💰</span>
                  Price Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div
                    className={`rounded-xl p-5 border ${
                      isDark
                        ? "bg-linear-to-br from-green-500/10 to-emerald-500/10 border-green-500/30"
                        : "bg-linear-to-br from-green-50 to-emerald-50 border-green-200"
                    }`}
                  >
                    <p
                      className={`text-sm mb-2 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Current Price
                    </p>
                    <p
                      className={`text-3xl font-black ${
                        isDark ? "text-green-400" : "text-green-600"
                      }`}
                    >
                      {formatPrice(token.priceAda)}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-5 border ${
                      isDark
                        ? "bg-linear-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30"
                        : "bg-linear-to-br from-blue-50 to-cyan-50 border-blue-200"
                    }`}
                  >
                    <p
                      className={`text-sm mb-2 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Liquidity TVL
                    </p>
                    <p
                      className={`text-3xl font-black ${
                        isDark ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      ₳{formatTVL(token.liquidityTvl)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Token Details Card */}
              <div
                className={`rounded-2xl p-6 shadow-lg border ${
                  isDark
                    ? "bg-slate-800/50 border-white/10"
                    : "bg-white border-gray-200"
                }`}
              >
                <h3
                  className={`text-lg font-bold mb-5 flex items-center gap-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  <span className="text-2xl">🔖</span>
                  Token Details
                </h3>
                <div className="space-y-4">
                  <div
                    className={`rounded-xl p-4 border ${
                      isDark
                        ? "bg-slate-900/50 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <p
                      className={`text-sm mb-2 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Policy ID
                    </p>
                    <div
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => {
                        navigator.clipboard.writeText(token.policyId);
                        toast.success("Policy ID copied!");
                      }}
                    >
                      <p
                        className={`font-mono text-sm break-all transition-colors flex-1 ${
                          isDark
                            ? "text-white group-hover:text-purple-400"
                            : "text-gray-900 group-hover:text-blue-600"
                        }`}
                      >
                        {token.policyId}
                      </p>
                      <span
                        className={`text-lg ${
                          isDark
                            ? "text-gray-400 group-hover:text-purple-400"
                            : "text-gray-400 group-hover:text-blue-600"
                        }`}
                      >
                        📋
                      </span>
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-4 border ${
                      isDark
                        ? "bg-slate-900/50 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <p
                      className={`text-sm mb-2 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Asset Name
                    </p>
                    <p
                      className={`font-mono text-sm ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {token.assetName || "N/A"}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-4 border ${
                      isDark
                        ? "bg-slate-900/50 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <p
                      className={`text-sm mb-2 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Pool ID
                    </p>
                    <p
                      className={`font-mono text-sm break-all ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {token.poolId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pool Info Card */}
              <div
                className={`rounded-2xl p-6 shadow-lg border ${
                  isDark
                    ? "bg-slate-800/50 border-white/10"
                    : "bg-white border-gray-200"
                }`}
              >
                <h3
                  className={`text-lg font-bold mb-5 flex items-center gap-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  <span className="text-2xl">🔄</span>
                  Pool Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className={`rounded-xl p-4 border ${
                      isDark
                        ? "bg-slate-900/50 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <p
                      className={`text-sm mb-2 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      DEX Source
                    </p>
                    <span
                      className={`inline-block px-4 py-2 rounded-xl font-semibold text-sm shadow-md text-white ${
                        isDark
                          ? "bg-linear-to-r from-purple-500 to-pink-500"
                          : "bg-linear-to-r from-blue-500 to-cyan-500"
                      }`}
                    >
                      {token.dexSource}
                    </span>
                  </div>
                  <div
                    className={`rounded-xl p-4 border ${
                      isDark
                        ? "bg-slate-900/50 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <p
                      className={`text-sm mb-2 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Last Updated
                    </p>
                    <p
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
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
                className={`block px-6 py-4 font-bold rounded-2xl hover:scale-105 transition-all text-center shadow-xl text-white ${
                  isDark
                    ? "bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/30"
                    : "bg-linear-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-blue-500/30"
                }`}
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
      <div
        className={`group rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer flex flex-col h-full overflow-hidden border ${
          isDark
            ? "bg-linear-to-br from-slate-900 to-slate-800 border-white/10"
            : "bg-linear-to-br from-white to-gray-50 border-gray-200"
        }`}
      >
        {/* Header with gradient accent */}
        <div
          className={`p-4 sm:p-5 border-b ${
            isDark
              ? "bg-linear-to-r from-purple-500/20 to-pink-500/20 border-white/10"
              : "bg-linear-to-r from-blue-500/10 to-cyan-500/10 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shrink-0 group-hover:scale-110 transition-transform ${
                isDark
                  ? "bg-linear-to-br from-purple-500 to-pink-500 shadow-purple-500/30"
                  : "bg-linear-to-br from-blue-500 to-cyan-500 shadow-blue-500/30"
              }`}
            >
              <span className="text-xl">{token.symbol.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`text-xl font-bold truncate ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {token.symbol}
              </div>
              <div
                className={`text-sm truncate ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {token.name}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5 space-y-4">
          {/* Policy ID */}
          <div
            className={`text-xs font-mono truncate cursor-pointer transition-colors px-3 py-2 rounded-lg ${
              isDark
                ? "text-gray-400 bg-slate-800/50 hover:text-purple-400"
                : "text-gray-500 bg-gray-100 hover:text-blue-600"
            }`}
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
            <div
              className={`rounded-xl p-3 border ${
                isDark
                  ? "bg-linear-to-br from-green-500/10 to-emerald-500/10 border-green-500/30"
                  : "bg-linear-to-br from-green-50 to-emerald-50 border-green-200"
              }`}
            >
              <span
                className={`text-xs block mb-1 ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Price (ADA)
              </span>
              <p
                className={`text-lg font-bold truncate ${
                  isDark ? "text-green-400" : "text-green-600"
                }`}
              >
                {formatPrice(token.priceAda)}
              </p>
            </div>
            <div
              className={`rounded-xl p-3 border ${
                isDark
                  ? "bg-linear-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30"
                  : "bg-linear-to-br from-blue-50 to-cyan-50 border-blue-200"
              }`}
            >
              <span
                className={`text-xs block mb-1 ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Liquidity
              </span>
              <p
                className={`text-lg font-bold truncate ${
                  isDark ? "text-blue-400" : "text-blue-600"
                }`}
              >
                ₳{formatTVL(token.liquidityTvl)}
              </p>
            </div>
          </div>

          {/* DEX Source */}
          <div className="flex justify-between items-center py-2">
            <span
              className={`text-sm ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Source:
            </span>
            <span
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md text-white ${
                isDark
                  ? "bg-linear-to-r from-purple-500 to-pink-500"
                  : "bg-linear-to-r from-blue-500 to-cyan-500"
              }`}
            >
              {token.dexSource}
            </span>
          </div>

          {/* Last Updated */}
          <div
            className={`text-xs text-center py-2 rounded-lg ${
              isDark
                ? "text-gray-400 bg-slate-800/50"
                : "text-gray-500 bg-gray-100"
            }`}
          >
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
            className={`w-full px-4 py-3 font-bold rounded-xl hover:scale-105 transition-all shadow-lg text-white ${
              isDark
                ? "bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/30"
                : "bg-linear-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-blue-500/30"
            }`}
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
