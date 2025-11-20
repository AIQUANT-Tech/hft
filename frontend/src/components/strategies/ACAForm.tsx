// src/components/strategies/ACAForm.tsx

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import type { Token } from "@/redux/tokensSlice";
import { selectIsDark } from "@/redux/themeSlice";

const API_URL = "http://localhost:8080";

interface Props {
  tokens: Token[];
  wallets: string[];
  loading: boolean;
}

export default function ACAForm({ tokens, wallets, loading }: Props) {
  const isDark = useSelector(selectIsDark);
  const [formData, setFormData] = useState({
    name: "",
    walletAddress: wallets[0] || "",
    tradingPair: "MIN-ADA",
    baseToken: "",
    quoteToken: "ADA",
    investmentAmount: "",
    intervalMinutes: "60",
    totalRuns: "",
    executeOnce: false,
    poolId: "Pool Identifier",
  });

  const intervalOptions = [
    { value: "5", label: "Every 5 minutes" },
    { value: "15", label: "Every 15 minutes" },
    { value: "30", label: "Every 30 minutes" },
    { value: "60", label: "Every hour" },
    { value: "240", label: "Every 4 hours" },
    { value: "1440", label: "Daily" },
    { value: "10080", label: "Weekly" },
    { value: "525600", label: "Monthly" },
  ];

  const handleTokenSelect = (tokenId: string) => {
    const token = tokens.find((t) => t.id === parseInt(tokenId));
    if (token) {
      setFormData((prev) => ({
        ...prev,
        tradingPair: `${token.symbol}-ADA`,
        baseToken: `${token.policyId}.${token.assetName}`,
        poolId: token.poolId,
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
        `${API_URL}/api/strategy/aca`,
        {
          name: formData.name,
          walletAddress: formData.walletAddress,
          tradingPair: formData.tradingPair,
          baseToken: formData.baseToken,
          quoteToken: formData.quoteToken,
          investmentAmount: parseFloat(formData.investmentAmount),
          intervalMinutes: parseInt(formData.intervalMinutes),
          totalRuns: formData.totalRuns
            ? parseInt(formData.totalRuns)
            : undefined,
          executeOnce: formData.executeOnce,
          poolId: formData.poolId,
        },
        { withCredentials: true }
      );

      toast.success(`ACA Strategy "${formData.name}" created successfully!`);

      setFormData({
        name: "",
        walletAddress: wallets[0] || "",
        tradingPair: "MIN-ADA",
        baseToken: "",
        quoteToken: "ADA",
        investmentAmount: "",
        intervalMinutes: "60",
        totalRuns: "",
        executeOnce: false,
        poolId: "Pool Identifier",
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to create ACA strategy"
      );
    }
  };

  const estimateMetrics = () => {
    if (!formData.investmentAmount || !formData.intervalMinutes) return null;

    const amountPerBuy = parseFloat(formData.investmentAmount);
    const intervalHours = parseInt(formData.intervalMinutes) / 60;
    const totalRuns = formData.totalRuns ? parseInt(formData.totalRuns) : null;

    return {
      dailyBuys: Math.floor(24 / intervalHours),
      dailyInvestment: (24 / intervalHours) * amountPerBuy,
      weeklyInvestment: (24 / intervalHours) * amountPerBuy * 7,
      totalInvestment: totalRuns ? totalRuns * amountPerBuy : null,
    };
  };

  const metrics = estimateMetrics();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strategy Name */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Strategy Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Daily MIN ACA"
            required
            className={`w-full px-4 py-3 rounded-xl border-2 placeholder-gray-500 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-green-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500"
              }`}
          />
        </div>

        {/* Wallet Selection */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
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
            className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors disabled:opacity-50 ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-green-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500"
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

        {/* Token Selection */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Select Token *
          </label>
          <select
            onChange={(e) => handleTokenSelect(e.target.value)}
            required
            className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-green-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500"
              }`}
          >
            <option value="">Choose a token...</option>
            {tokens.map((token) => (
              <option key={token.id} value={token.id}>
                {token.symbol} - ADA
              </option>
            ))}
          </select>
        </div>

        {/* Trading Pair */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Trading Pair
          </label>
          <input
            type="text"
            value={formData.tradingPair}
            readOnly
            className={`w-full px-4 py-3 rounded-xl border-2 cursor-not-allowed ${isDark
              ? "bg-slate-700 border-white/10 text-gray-400"
              : "bg-gray-200 border-gray-300 text-gray-600"
              }`}
          />
        </div>

        {/* Pool Id */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Pool ID
          </label>
          <input
            type="text"
            value={formData.poolId}
            readOnly
            className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-blue-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
              }`}
          />
        </div>

        {/* Investment Amount per Interval */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Investment Amount (ADA) *
          </label>
          <input
            type="number"
            step="0.01"
            min="1"
            value={formData.investmentAmount}
            onChange={(e) =>
              setFormData({ ...formData, investmentAmount: e.target.value })
            }
            placeholder="10"
            required
            className={`w-full px-4 py-3 rounded-xl border-2 placeholder-gray-500 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-green-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500"
              }`}
          />
          <p
            className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"
              }`}
          >
            ADA to spend per buy interval
          </p>
        </div>

        {/* Interval */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Buy Interval *
          </label>
          <select
            value={formData.intervalMinutes}
            onChange={(e) =>
              setFormData({ ...formData, intervalMinutes: e.target.value })
            }
            className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-green-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500"
              }`}
          >
            {intervalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                ⏰ {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Total Runs (Optional) */}
        <div className="md:col-span-2">
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Total Executions (Optional)
          </label>
          <input
            type="number"
            min="1"
            value={formData.totalRuns}
            onChange={(e) =>
              setFormData({ ...formData, totalRuns: e.target.value })
            }
            placeholder="Leave empty for unlimited"
            className={`w-full px-4 py-3 rounded-xl border-2 placeholder-gray-500 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-green-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500"
              }`}
          />
          <p
            className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"
              }`}
          >
            Limit the number of buy executions (leave empty for continuous)
          </p>
        </div>
      </div>

      {/* Execute Once Toggle */}
      <div
        className={`rounded-xl p-4 border-2 ${isDark
          ? "bg-linear-to-r from-green-500/10 to-emerald-500/10 border-green-500/30"
          : "bg-linear-to-r from-green-50 to-emerald-50 border-green-200"
          }`}
      >
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="executeOnceACA"
            checked={formData.executeOnce}
            onChange={(e) =>
              setFormData({ ...formData, executeOnce: e.target.checked })
            }
            className={`w-6 h-6 mt-0.5 rounded-lg border-2 text-green-500 focus:ring-2 focus:ring-green-500 cursor-pointer ${isDark
              ? "bg-slate-800 border-white/20"
              : "bg-white border-gray-300"
              }`}
          />
          <label htmlFor="executeOnceACA" className="flex-1 cursor-pointer">
            <div
              className={`font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"
                }`}
            >
              Single Buy Mode
            </div>
            <div
              className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"
                }`}
            >
              {formData.executeOnce
                ? "✅ Will execute only one buy then stop"
                : "♾️ Will continue buying at each interval (ACA mode)"}
            </div>
          </label>
        </div>
      </div>

      {/* Estimated Metrics */}
      {metrics && formData.baseToken && (
        <div
          className={`rounded-xl p-5 border-2 ${isDark
            ? "bg-linear-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30"
            : "bg-linear-to-r from-blue-50 to-cyan-50 border-blue-200"
            }`}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl">📊</div>
            <div className="flex-1">
              <p
                className={`font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"
                  }`}
              >
                ACA Strategy Projections
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p
                    className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                  >
                    Buys per day
                  </p>
                  <p
                    className={`font-bold ${isDark ? "text-blue-400" : "text-blue-600"
                      }`}
                  >
                    {metrics.dailyBuys}x
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                  >
                    Daily investment
                  </p>
                  <p
                    className={`font-bold ${isDark ? "text-green-400" : "text-green-600"
                      }`}
                  >
                    ₳{metrics.dailyInvestment.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                  >
                    Weekly investment
                  </p>
                  <p
                    className={`font-bold ${isDark ? "text-purple-400" : "text-purple-600"
                      }`}
                  >
                    ₳{metrics.weeklyInvestment.toFixed(2)}
                  </p>
                </div>
                {metrics.totalInvestment && (
                  <div>
                    <p
                      className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                    >
                      Total investment
                    </p>
                    <p
                      className={`font-bold ${isDark ? "text-orange-400" : "text-orange-600"
                        }`}
                    >
                      ₳{metrics.totalInvestment.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p
            className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"
              }`}
          >
            💡 <strong>ACA Strategy:</strong> Automatically buys{" "}
            {formData.tradingPair.split("-")[0]} with{" "}
            <strong>₳{formData.investmentAmount}</strong> every{" "}
            <strong>
              {intervalOptions
                .find((o) => o.value === formData.intervalMinutes)
                ?.label.toLowerCase()}
            </strong>
            {formData.totalRuns
              ? ` for ${formData.totalRuns} executions`
              : " continuously"}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={wallets.length === 0}
        className="w-full px-6 py-4 bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        📊 Create ACA Strategy
      </button>
    </form>
  );
}
