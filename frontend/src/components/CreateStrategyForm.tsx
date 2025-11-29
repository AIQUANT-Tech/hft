// src/components/CreateStrategyForm.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import PriceTargetForm from "./strategies/PriceTargetForm";
import ACAForm from "./strategies/ACAForm";
import GridTradingForm from "./strategies/GridTradingForm";
import StopLossTakeProfitForm from "./strategies/StopLossTakeProfitForm";
import { selectAuth } from "@/redux/authSlice";
import type { Token } from "@/redux/tokensSlice";
import { selectIsDark } from "@/redux/themeSlice";

const API_URL = import.meta.env.VITE_SERVER_URL;

type StrategyType =
  | "PRICE_TARGET"
  | "ACA"
  | "GRID_TRADING"
  | "STOP_LOSS_TAKE_PROFIT";

export default function CreateStrategyForm() {
  const isDark = useSelector(selectIsDark);
  const [selectedStrategy, setSelectedStrategy] =
    useState<StrategyType>("PRICE_TARGET");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [wallets, setWallets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useSelector(selectAuth);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWallets();
      fetchTokens();
    }
  }, [isAuthenticated, user]);

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

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/wallet/list`, {
        withCredentials: true,
      });
      const addresses = response.data.wallets || [];
      setWallets(addresses);
    } catch (error) {
      console.error("Failed to fetch wallets:", error);
      toast.error("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  };

  const strategies = [
    {
      type: "PRICE_TARGET" as const,
      name: "Price Target",
      icon: "🎯",
      description: "Buy/sell when price hits target",
    },
    {
      type: "ACA" as const,
      name: "DCA (Dollar Cost Average)",
      icon: "📊",
      description: "Buy fixed amounts regularly",
    },
    {
      type: "GRID_TRADING" as const,
      name: "Grid Trading",
      icon: "📐",
      description: "Multiple orders in price range",
    },
    {
      type: "STOP_LOSS_TAKE_PROFIT" as const, // NEW
      name: "Stop Loss / Take Profit",
      icon: "🛡️️",
      description: "Auto sell at loss/profit levels",
    },
  ];

  const getStrategyColor = (type: StrategyType) => {
    const colors: Record<StrategyType, string> = {
      PRICE_TARGET: "from-blue-500 to-cyan-500",
      ACA: "from-green-500 to-emerald-500",
      GRID_TRADING: "from-purple-500 to-pink-500",
      STOP_LOSS_TAKE_PROFIT: "from-orange-500 to-red-500",
    };
    return colors[type];
  };

  return (
    <div
      className={`rounded-2xl p-8 shadow-xl border ${
        isDark
          ? "bg-linear-to-br from-slate-900 to-slate-800 border-white/10 shadow-slate-900/50"
          : "bg-linear-to-br from-white to-gray-50 border-gray-200 shadow-lg"
      }`}
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-500/20 rounded-2xl">
          <span className="text-2xl">📝</span>
        </div>
        <div>
          <h3
            className={`text-3xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Create New Strategy
          </h3>
          <p
            className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}
          >
            Select strategy type and configure parameters
          </p>
        </div>
      </div>

      {/* Strategy Type Dropdown */}
      <div className="mb-8">
        <label
          className={`block text-sm font-semibold mb-3 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Strategy Type <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={selectedStrategy}
            onChange={(e) =>
              setSelectedStrategy(e.target.value as StrategyType)
            }
            className={`w-full p-4 pl-12 pr-10 rounded-2xl border-2 font-semibold text-lg transition-all focus:outline-none focus:ring-4 ${
              isDark
                ? "bg-slate-800 border-white/20 text-white focus:border-blue-500 focus:ring-blue-500/20"
                : "bg-white border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
            }`}
          >
            {strategies.map((strategy) => (
              <option key={strategy.type} value={strategy.type}>
                {strategy.icon} {strategy.name}
              </option>
            ))}
          </select>
          <div
            className={`absolute left-4 top-1/2 -translate-y-1/2 ${
              isDark ? "text-slate-400" : "text-gray-500"
            }`}
          >
            {strategies.find((s) => s.type === selectedStrategy)?.icon}
          </div>
          <div
            className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${
              isDark ? "text-slate-400" : "text-gray-500"
            }`}
          >
            ▼
          </div>
        </div>
      </div>

      {/* Strategy Preview Card */}
      <div
        className={`p-6 rounded-2xl mb-8 border ${
          isDark
            ? "bg-slate-800/50 border-white/10"
            : "bg-blue-50 border-blue-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl bg-linear-to-r ${getStrategyColor(
              selectedStrategy
            )} shadow-lg`}
          >
            <span className="text-2xl opacity-90">
              {strategies.find((s) => s.type === selectedStrategy)?.icon}
            </span>
          </div>
          <div>
            <h4
              className={`font-bold text-xl ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {strategies.find((s) => s.type === selectedStrategy)?.name}
            </h4>
            <p
              className={`text-sm ${
                isDark ? "text-slate-300" : "text-gray-700"
              }`}
            >
              {strategies.find((s) => s.type === selectedStrategy)?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Strategy Forms */}
      <div
        className={`space-y-6 animate-in fade-in duration-500 ${
          loading ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {selectedStrategy === "PRICE_TARGET" && (
          <PriceTargetForm
            tokens={tokens}
            wallets={wallets}
            loading={loading}
          />
        )}
        {selectedStrategy === "ACA" && (
          <ACAForm tokens={tokens} wallets={wallets} loading={loading} />
        )}
        {selectedStrategy === "GRID_TRADING" && (
          <GridTradingForm
            tokens={tokens}
            wallets={wallets}
            loading={loading}
          />
        )}
        {selectedStrategy === "STOP_LOSS_TAKE_PROFIT" && (
          <StopLossTakeProfitForm
            tokens={tokens}
            wallets={wallets}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
