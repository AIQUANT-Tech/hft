// src/components/strategies/StopLossTakeProfitForm.tsx
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import type { Token } from "@/redux/tokensSlice";
import { selectIsDark } from "@/redux/themeSlice";
import { useSelector } from "react-redux";

const API_URL = import.meta.env.VITE_SERVER_URL;

interface Props {
  tokens: Token[];
  wallets: string[];
  loading: boolean;
}

export default function StopLossTakeProfitForm({
  tokens,
  wallets,
  loading,
}: Props) {
  const isDark = useSelector(selectIsDark);

  const [formData, setFormData] = useState({
    walletAddress: wallets[0] || "",
    tradingPair: "",
    baseToken: "",
    quoteToken: "ADA",
    amount: "",
    stopLossPercent: "10", // 10% loss
    takeProfitPercent: "20", // 20% profit
    executeOnce: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        type: "stop-loss-take-profit",
        config: JSON.stringify({
          ...formData,
          stopLossPercent: parseFloat(formData.stopLossPercent),
          takeProfitPercent: parseFloat(formData.takeProfitPercent),
        }),
      };

      await axios.post(`${API_URL}/api/strategies`, payload, {
        withCredentials: true,
      });

      toast.success("Stop Loss / Take Profit strategy created!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create strategy");
    }
  };

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Wallet */}
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
          className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors disabled:opacity-50 ${
            isDark
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

      {/* Trading Pair */}
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
          className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${
            isDark
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

      {/* Amount */}
      <div>
        <label
          className={`block text-sm font-semibold mb-2 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Amount (ADA)
        </label>
        <input
          type="number"
          placeholder="100"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          className={`w-full p-4 rounded-xl border ${
            isDark
              ? "bg-slate-800 border-white/20 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
          required
        />
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Stop Loss (%)
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder="10"
              value={formData.stopLossPercent}
              onChange={(e) =>
                setFormData({ ...formData, stopLossPercent: e.target.value })
              }
              className={`w-full p-4 pl-12 rounded-xl border ${
                isDark
                  ? "bg-slate-800 border-white/20 text-white"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-red-500">
              %
            </span>
          </div>
          <p className="text-xs mt-1 text-red-400">
            Sell if price drops by this %
          </p>
        </div>

        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Take Profit (%)
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder="20"
              value={formData.takeProfitPercent}
              onChange={(e) =>
                setFormData({ ...formData, takeProfitPercent: e.target.value })
              }
              className={`w-full p-4 pl-12 rounded-xl border ${
                isDark
                  ? "bg-slate-800 border-white/20 text-white"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-green-500">
              %
            </span>
          </div>
          <p className="text-xs mt-1 text-green-400">
            Sell if price rises by this %
          </p>
        </div>
      </div>

      {/* Execute Once */}
      <div className="flex items-center gap-3 p-4 bg-orange-500/10 rounded-xl border-2 border-orange-500/20">
        <input
          type="checkbox"
          id="executeOnce"
          checked={formData.executeOnce}
          onChange={(e) =>
            setFormData({ ...formData, executeOnce: e.target.checked })
          }
          className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
        />
        <label
          htmlFor="executeOnce"
          className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          Execute Once (disable after first trigger)
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-8 rounded-2xl text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? "🚀 Creating Strategy..."
          : "🚀 Create Stop Loss / Take Profit Strategy"}
      </button>
    </form>
  );
}
