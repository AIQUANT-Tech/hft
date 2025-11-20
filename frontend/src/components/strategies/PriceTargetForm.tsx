// src/components/strategies/PriceTargetForm.tsx

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

export default function PriceTargetForm({ tokens, wallets, loading }: Props) {
  const isDark = useSelector(selectIsDark);
  const [formData, setFormData] = useState({
    name: "",
    walletAddress: wallets[0] || "",
    tradingPair: "MIN-ADA",
    poolId: "Pool Identifier",
    baseToken: "",
    quoteToken: "ADA",
    targetPrice: "",
    orderAmount: "",
    side: "BUY",
    triggerType: "BELOW",
    executeOnce: true,
  });

  const handleTokenSelect = (tokenId: string) => {
    const token = tokens.find((t) => t.id === parseInt(tokenId));
    if (token) {
      setFormData((prev) => ({
        ...prev,
        tradingPair: `${token.symbol}-ADA`,
        baseToken: `${token.policyId}.${token.assetName}`,
        poolId: token.poolId,
        targetPrice: token.priceAda.toString(),
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
        `${API_URL}/api/strategy/price-target`,
        {
          name: formData.name,
          walletAddress: formData.walletAddress,
          tradingPair: formData.tradingPair,
          baseToken: formData.baseToken,
          quoteToken: formData.quoteToken,
          targetPrice: parseFloat(formData.targetPrice),
          orderAmount: parseFloat(formData.orderAmount),
          side: formData.side,
          triggerType: formData.triggerType,
          executeOnce: formData.executeOnce,
          poolId: formData.poolId,
        },
        { withCredentials: true }
      );

      toast.success(`Strategy "${formData.name}" created successfully!`);

      // Reset form
      setFormData({
        name: "",
        walletAddress: wallets[0] || "",
        tradingPair: "MIN-ADA",
        baseToken: "",
        quoteToken: "ADA",
        targetPrice: "",
        orderAmount: "",
        side: "BUY",
        triggerType: "BELOW",
        poolId: "Pool Identifier",
        executeOnce: true,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create strategy");
    }
  };

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
            placeholder="e.g., Buy MIN Dip"
            required
            className={`w-full px-4 py-3 rounded-xl border-2 placeholder-gray-500 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-blue-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
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
              ? "bg-slate-800 border-white/10 text-white focus:border-blue-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
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
              ? "bg-slate-800 border-white/10 text-white focus:border-blue-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
              }`}
          >
            <option value="">Choose a token...</option>
            {tokens.map((token) => (
              <option key={token.id} value={token.id}>
                {token.symbol} - ADA ({`₳ ${token.priceAda}`})
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

        {/* Target Price */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Target Price (ADA) *
          </label>
          <input
            type="number"
            step="0.000001"
            value={formData.targetPrice}
            onChange={(e) =>
              setFormData({ ...formData, targetPrice: e.target.value })
            }
            placeholder="0.05"
            required
            className={`w-full px-4 py-3 rounded-xl border-2 placeholder-gray-500 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-blue-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
              }`}
          />
        </div>

        {/* Order Amount */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Order Amount (Tokens) *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.orderAmount}
            onChange={(e) =>
              setFormData({ ...formData, orderAmount: e.target.value })
            }
            placeholder="100"
            required
            className={`w-full px-4 py-3 rounded-xl border-2 placeholder-gray-500 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-blue-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
              }`}
          />
        </div>

        {/* Side */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Order Side *
          </label>
          <select
            value={formData.side}
            onChange={(e) => setFormData({ ...formData, side: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-blue-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
              }`}
          >
            <option value="BUY">📈 BUY</option>
            <option value="SELL">📉 SELL</option>
          </select>
        </div>

        {/* Trigger Type */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}
          >
            Trigger When Price *
          </label>
          <select
            value={formData.triggerType}
            onChange={(e) =>
              setFormData({ ...formData, triggerType: e.target.value })
            }
            className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${isDark
              ? "bg-slate-800 border-white/10 text-white focus:border-blue-500"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
              }`}
          >
            <option value="BELOW">⬇️ Falls Below Target</option>
            <option value="ABOVE">⬆️ Rises Above Target</option>
          </select>
        </div>
      </div>

      {/* Execute Once Toggle */}
      <div
        className={`rounded-xl p-4 border-2 ${isDark
          ? "bg-linear-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30"
          : "bg-linear-to-r from-blue-50 to-cyan-50 border-blue-200"
          }`}
      >
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="executeOnce"
            checked={formData.executeOnce}
            onChange={(e) =>
              setFormData({ ...formData, executeOnce: e.target.checked })
            }
            className={`w-6 h-6 mt-0.5 rounded-lg border-2 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer ${isDark
              ? "bg-slate-800 border-white/20"
              : "bg-white border-gray-300"
              }`}
          />
          <label htmlFor="executeOnce" className="flex-1 cursor-pointer">
            <div
              className={`font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"
                }`}
            >
              Execute Once
            </div>
            <div
              className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"
                }`}
            >
              {formData.executeOnce
                ? "✅ Strategy will stop after first successful trade"
                : "♾️ Strategy will continue running after each trade (continuous)"}
            </div>
          </label>
        </div>
      </div>

      {/* Strategy Preview */}
      {formData.baseToken && formData.walletAddress && (
        <div
          className={`rounded-xl p-5 border-2 ${isDark
            ? "bg-linear-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30"
            : "bg-linear-to-r from-purple-50 to-pink-50 border-purple-200"
            }`}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">🎯</div>
            <div className="flex-1">
              <p
                className={`font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"
                  }`}
              >
                Strategy Preview
              </p>
              <p
                className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"
                  }`}
              >
                Will{" "}
                <span
                  className={`font-bold ${isDark ? "text-purple-400" : "text-purple-600"
                    }`}
                >
                  {formData.side}
                </span>{" "}
                <span className="font-bold">{formData.orderAmount}</span>{" "}
                {formData.tradingPair.split("-")[0]} when price{" "}
                <span
                  className={`font-bold ${isDark ? "text-blue-400" : "text-blue-600"
                    }`}
                >
                  {formData.triggerType === "ABOVE"
                    ? "rises above"
                    : "falls below"}{" "}
                  ₳{formData.targetPrice}
                </span>
                {formData.executeOnce ? " (one-time)" : " (continuous)"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={wallets.length === 0}
        className="w-full px-6 py-4 bg-linear-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        🚀 Create Price Target Strategy
      </button>
    </form>
  );
}
