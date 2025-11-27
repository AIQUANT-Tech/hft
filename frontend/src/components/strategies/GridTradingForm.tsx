// src/components/strategies/GridForm.tsx

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import type { Token } from "@/redux/tokensSlice";
import { selectIsDark } from "@/redux/themeSlice";

const API_URL = import.meta.env.VITE_SERVER_URL;

interface Props {
  tokens: Token[];
  wallets: string[];
  loading: boolean;
}

// ✅ Helper function to format prices with full decimals
const formatPriceWithDecimals = (price: string | number): string => {
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  if (!priceNum || priceNum === 0) return "N/A";

  // Show up to 12 decimals, remove trailing zeros
  return priceNum.toFixed(12).replace(/\.?0+$/, "");
};

export default function GridForm({ tokens, wallets, loading }: Props) {
  const isDark = useSelector(selectIsDark);
  const [formData, setFormData] = useState({
    name: "",
    walletAddress: wallets[0] || "",
    tradingPair: "MIN-ADA",
    baseToken: "",
    quoteToken: "ADA",
    poolId: "",
    lowerPrice: "",
    upperPrice: "",
    gridLevels: "10",
    investmentPerGrid: "",
    executeOnce: false,
  });

  const handleTokenSelect = (tokenId: string) => {
    const token = tokens.find((t) => t.id === parseInt(tokenId));
    if (token) {
      const currentPrice = parseFloat(token.priceAda);

      setFormData((prev) => ({
        ...prev,
        tradingPair: `${token.symbol}-ADA`,
        baseToken: `${token.policyId}.${token.assetName}`,
        poolId: token.poolId,
        lowerPrice: formatPriceWithDecimals(currentPrice * 0.9),
        upperPrice: formatPriceWithDecimals(currentPrice * 1.1),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.walletAddress) {
      toast.error("Please select a wallet");
      return;
    }

    if (!formData.baseToken) {
      toast.error("Please select a token");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/strategy/grid`,
        {
          name: formData.name,
          walletAddress: formData.walletAddress,
          tradingPair: formData.tradingPair,
          baseToken: formData.baseToken,
          quoteToken: formData.quoteToken,
          poolId: formData.poolId,
          lowerPrice: parseFloat(formData.lowerPrice),
          upperPrice: parseFloat(formData.upperPrice),
          gridLevels: parseInt(formData.gridLevels),
          investmentPerGrid: parseFloat(formData.investmentPerGrid),
          executeOnce: formData.executeOnce,
        },
        { withCredentials: true }
      );

      toast.success(`Grid Strategy "${formData.name}" created successfully!`);

      setFormData({
        name: "",
        walletAddress: wallets[0] || "",
        tradingPair: "MIN-ADA",
        baseToken: "",
        quoteToken: "ADA",
        poolId: "",
        lowerPrice: "",
        upperPrice: "",
        gridLevels: "10",
        investmentPerGrid: "",
        executeOnce: false,
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to create Grid strategy"
      );
    }
  };

  const calculateMetrics = () => {
    if (
      !formData.lowerPrice ||
      !formData.upperPrice ||
      !formData.gridLevels ||
      !formData.investmentPerGrid
    ) {
      return null;
    }

    const lower = parseFloat(formData.lowerPrice);
    const upper = parseFloat(formData.upperPrice);
    const levels = parseInt(formData.gridLevels);
    const investment = parseFloat(formData.investmentPerGrid);

    const gridSpacing = (upper - lower) / (levels - 1);
    const totalInvestment = investment * levels;
    const profitPerCycle = gridSpacing * (investment / lower);

    return {
      gridSpacing: formatPriceWithDecimals(gridSpacing),
      totalInvestment: totalInvestment.toFixed(2),
      profitPerCycle: formatPriceWithDecimals(profitPerCycle),
      priceRange: `${(((upper - lower) / lower) * 100).toFixed(2)}%`,
    };
  };

  const metrics = calculateMetrics();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Strategy Name & Wallet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Strategy Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., MIN Grid 10%"
            required
            className={`w-full px-4 py-3 rounded-xl border-2 placeholder-gray-500 focus:outline-none ${
              isDark
                ? "bg-slate-800 border-white/10 text-white focus:border-purple-500"
                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"
            }`}
          />
        </div>

        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Select Wallet *
          </label>
          <select
            value={formData.walletAddress}
            onChange={(e) =>
              setFormData({ ...formData, walletAddress: e.target.value })
            }
            required
            disabled={loading || wallets.length === 0}
            className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none disabled:opacity-50 ${
              isDark
                ? "bg-slate-800 border-white/10 text-white focus:border-purple-500"
                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"
            }`}
          >
            <option value="">
              {loading
                ? "Loading..."
                : wallets.length === 0
                ? "No wallets"
                : "Choose wallet..."}
            </option>
            {wallets.map((address) => (
              <option key={address} value={address}>
                {address.substring(0, 20)}...
                {address.substring(address.length - 10)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Token Selection */}
      <div>
        <label
          className={`block text-sm font-semibold mb-2 ${
            isDark ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Select Token *
        </label>
        <select
          onChange={(e) => handleTokenSelect(e.target.value)}
          required
          className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none ${
            isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-purple-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"
          }`}
        >
          <option value="">Choose a token...</option>
          {tokens.map((token) => (
            <option key={token.id} value={token.id}>
              {token.symbol} - Current: ₳
              {formatPriceWithDecimals(token.priceAda)}
            </option>
          ))}
        </select>
      </div>

      {/* Grid Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Lower Price (ADA) *
          </label>
          <input
            type="text"
            value={formData.lowerPrice}
            onChange={(e) =>
              setFormData({ ...formData, lowerPrice: e.target.value })
            }
            placeholder="0.000000009"
            required
            className={`w-full px-4 py-3 rounded-xl border-2 placeholder-gray-500 focus:outline-none ${
              isDark
                ? "bg-slate-800 border-white/10 text-white focus:border-purple-500"
                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"
            }`}
          />
        </div>

        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Upper Price (ADA) *
          </label>
          <input
            type="text"
            value={formData.upperPrice}
            onChange={(e) =>
              setFormData({ ...formData, upperPrice: e.target.value })
            }
            placeholder="0.000000011"
            required
            className={`w-full px-4 py-3 rounded-xl border-2 placeholder-gray-500 focus:outline-none ${
              isDark
                ? "bg-slate-800 border-white/10 text-white focus:border-purple-500"
                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"
            }`}
          />
        </div>
      </div>

      {/* Grid Levels & Investment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Grid Levels *
          </label>
          <input
            type="number"
            min="2"
            max="50"
            value={formData.gridLevels}
            onChange={(e) =>
              setFormData({ ...formData, gridLevels: e.target.value })
            }
            required
            className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none ${
              isDark
                ? "bg-slate-800 border-white/10 text-white focus:border-purple-500"
                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"
            }`}
          />
          <p
            className={`text-xs mt-1 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Number of buy/sell levels (2-50)
          </p>
        </div>

        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Investment per Grid (ADA) *
          </label>
          <input
            type="number"
            step="0.01"
            min="1"
            value={formData.investmentPerGrid}
            onChange={(e) =>
              setFormData({ ...formData, investmentPerGrid: e.target.value })
            }
            placeholder="10"
            required
            className={`w-full px-4 py-3 rounded-xl border-2 placeholder-gray-500 focus:outline-none ${
              isDark
                ? "bg-slate-800 border-white/10 text-white focus:border-purple-500"
                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"
            }`}
          />
        </div>
      </div>

      {/* Execute Once Toggle */}
      <div
        className={`rounded-xl p-4 border-2 ${
          isDark
            ? "bg-linear-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30"
            : "bg-linear-to-r from-purple-50 to-pink-50 border-purple-200"
        }`}
      >
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="executeOnceGrid"
            checked={formData.executeOnce}
            onChange={(e) =>
              setFormData({ ...formData, executeOnce: e.target.checked })
            }
            className={`w-6 h-6 mt-0.5 rounded-lg border-2 text-purple-500 focus:ring-2 focus:ring-purple-500 cursor-pointer ${
              isDark
                ? "bg-slate-800 border-white/20"
                : "bg-white border-gray-300"
            }`}
          />
          <label htmlFor="executeOnceGrid" className="flex-1 cursor-pointer">
            <div
              className={`font-semibold mb-1 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Single Cycle Mode
            </div>
            <div
              className={`text-sm ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {formData.executeOnce
                ? "✅ Will stop after completing one buy-sell cycle"
                : "♾️ Will continue grid trading indefinitely"}
            </div>
          </label>
        </div>
      </div>

      {/* Metrics */}
      {metrics && formData.baseToken && (
        <div
          className={`rounded-xl p-5 border-2 ${
            isDark
              ? "bg-linear-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30"
              : "bg-linear-to-r from-blue-50 to-cyan-50 border-blue-200"
          }`}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl">📊</div>
            <div className="flex-1">
              <p
                className={`font-semibold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Grid Strategy Metrics
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p
                    className={`text-xs mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Grid Spacing
                  </p>
                  <p
                    className={`font-bold ${
                      isDark ? "text-purple-400" : "text-purple-600"
                    }`}
                  >
                    ₳{metrics.gridSpacing}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Total Investment
                  </p>
                  <p
                    className={`font-bold ${
                      isDark ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    ₳{metrics.totalInvestment}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Profit/Cycle
                  </p>
                  <p
                    className={`font-bold ${
                      isDark ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    ₳{metrics.profitPerCycle}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Price Range
                  </p>
                  <p
                    className={`font-bold ${
                      isDark ? "text-orange-400" : "text-orange-600"
                    }`}
                  >
                    {metrics.priceRange}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p
            className={`text-xs leading-relaxed ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            💡 <strong>Grid Trading:</strong> Places {formData.gridLevels}{" "}
            buy/sell orders between ₳{formData.lowerPrice} and ₳
            {formData.upperPrice}, capturing profit from price oscillations.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={wallets.length === 0}
        className="w-full px-6 py-4 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        📊 Create Grid Strategy
      </button>
    </form>
  );
}
