// src/components/CreateStrategyForm.tsx

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";

const API_URL = "http://localhost:8080";

interface Token {
  id: number;
  symbol: string;
  name: string;
  policyId: string;
  assetName: string;
}

export default function CreateStrategyForm() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [wallets, setWallets] = useState<string[]>([]); // ✅ Backend wallets
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    walletAddress: "",
    tradingPair: "MIN-ADA",
    baseToken: "",
    quoteToken: "ADA",
    targetPrice: "",
    orderAmount: "",
    side: "BUY",
    triggerType: "BELOW",
    executeOnce: true,
  });

  useEffect(() => {
    fetchTokens();
    fetchWallets(); // ✅ Fetch wallets on mount
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/tokens?page=1&count=100`
      );
      setTokens(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
    }
  };

  // ✅ Fetch backend wallets
  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/wallet/list`);
      const addresses = response.data.wallets || [];
      setWallets(addresses);

      // Auto-select first wallet if available
      if (addresses.length > 0 && !formData.walletAddress) {
        setFormData((prev) => ({ ...prev, walletAddress: addresses[0] }));
      }
    } catch (error) {
      console.error("Failed to fetch wallets:", error);
      toast.error("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSelect = (tokenId: string) => {
    const token = tokens.find((t) => t.id === parseInt(tokenId));
    if (token) {
      setFormData((prev) => ({
        ...prev,
        tradingPair: `${token.symbol}-ADA`,
        baseToken: `${token.policyId}.${token.assetName}`,
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
      const response = await axios.post(
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
        }
      );

      console.log("Strategy created:", response.data);

      toast.success(`Strategy "${formData.name}" created successfully!`);

      // Reset form but keep first wallet selected
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
        executeOnce: true,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create strategy");
    }
  };

  return (
    <div className="bg-linear-to-br from-white to-gray-100 dark:from-slate-900 dark:to-slate-800 border border-gray-300 dark:border-white/10 rounded-2xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        📝 Create New Strategy
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strategy Name */}
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2">
              Strategy Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Buy MIN Dip"
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* ✅ Wallet Selection Dropdown */}
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2">
              Select Wallet *
            </label>
            <select
              value={formData.walletAddress}
              onChange={(e) =>
                setFormData({ ...formData, walletAddress: e.target.value })
              }
              required
              disabled={loading || wallets.length === 0}
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loading
                  ? "Loading wallets..."
                  : wallets.length === 0
                  ? "No wallets available"
                  : "Choose a wallet..."}
              </option>
              {wallets.map((address) => (
                <option key={address} value={address}>
                  {address.substring(0, 20)}...
                  {address.substring(address.length - 10)}
                </option>
              ))}
            </select>
            {wallets.length === 0 && !loading && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                ⚠️ No wallets found. Create or import a wallet first.
              </p>
            )}
          </div>

          {/* Token Selection */}
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2">
              Select Token *
            </label>
            <select
              onChange={(e) => handleTokenSelect(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Choose a token...</option>
              {tokens.map((token) => (
                <option key={token.id} value={token.id}>
                  {token.symbol} - ADA
                </option>
              ))}
            </select>
          </div>

          {/* Trading Pair (Read-only) */}
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2">
              Trading Pair
            </label>
            <input
              type="text"
              value={formData.tradingPair}
              readOnly
              className="w-full px-4 py-3 rounded-lg bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2">
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
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Order Amount */}
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2">
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
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Side */}
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2">
              Order Side *
            </label>
            <select
              value={formData.side}
              onChange={(e) =>
                setFormData({ ...formData, side: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2">
              Trigger When Price *
            </label>
            <select
              value={formData.triggerType}
              onChange={(e) =>
                setFormData({ ...formData, triggerType: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="BELOW">Falls Below Target</option>
              <option value="ABOVE">Rises Above Target</option>
            </select>
          </div>
        </div>

        {/* Execute Once Checkbox */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="executeOnce"
            checked={formData.executeOnce}
            onChange={(e) =>
              setFormData({ ...formData, executeOnce: e.target.checked })
            }
            className="w-5 h-5 rounded bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <label
            htmlFor="executeOnce"
            className="text-gray-600 dark:text-gray-400 text-sm"
          >
            Execute only once (stop after first trade)
          </label>
        </div>

        {/* Strategy Preview */}
        {formData.baseToken && formData.walletAddress && (
          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
            <p className="text-blue-600 dark:text-blue-400 text-sm">
              <strong>Strategy Preview:</strong> Will {formData.side}{" "}
              <strong>{formData.orderAmount}</strong>{" "}
              {formData.tradingPair.split("-")[0]} when price{" "}
              {formData.triggerType === "ABOVE" ? "rises above" : "falls below"}{" "}
              <strong>₳{formData.targetPrice}</strong>
              <br />
              <span className="text-xs">
                Using wallet: {formData.walletAddress.substring(0, 15)}...
              </span>
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={wallets.length === 0}
          className="w-full px-6 py-4 bg-linear-to-r from-[#0033AD] to-[#00A3FF] text-white font-bold text-lg rounded-lg hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          🚀 Create Strategy
        </button>
      </form>
    </div>
  );
}
