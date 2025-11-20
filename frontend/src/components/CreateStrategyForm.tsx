// src/components/CreateStrategyForm.tsx

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import PriceTargetForm from "./strategies/PriceTargetForm";
import ACAForm from "./strategies/ACAForm";
import GridTradingForm from "./strategies/GridTradingForm";
import { selectAuth } from "@/redux/authSlice";
import type { Token } from "@/redux/tokensSlice";
import { selectIsDark } from "@/redux/themeSlice";

const API_URL = "http://localhost:8080";

type StrategyType = "PRICE_TARGET" | "ACA" | "GRID_TRADING";

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
      description: "Buy or sell when price reaches a target",
      color: "from-blue-500 to-cyan-500",
    },
    {
      type: "ACA" as const,
      name: "ACA (ADA Cost Average)",
      icon: "📊",
      description: "Buy fixed amount at regular intervals",
      color: "from-green-500 to-emerald-500",
    },
    {
      type: "GRID_TRADING" as const,
      name: "Grid Trading",
      icon: "📐",
      description: "Place multiple buy/sell orders in a price range",
      color: "from-purple-500 to-pink-500",
    },
  ];

  return (
    <div
      className={`rounded-2xl p-6 shadow-lg border ${isDark
        ? "bg-linear-to-br from-slate-900 to-slate-800 border-white/10 shadow-slate-900/50"
        : "bg-linear-to-br from-white to-gray-50 border-gray-300"
        }`}
    >
      <h3
        className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"
          }`}
      >
        📝 Create New Strategy
      </h3>

      {/* Strategy Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {strategies.map((strategy) => (
          <button
            key={strategy.type}
            onClick={() => setSelectedStrategy(strategy.type)}
            className={`relative p-6 rounded-2xl border-2 transition-all hover:scale-105 ${selectedStrategy === strategy.type
              ? `bg-linear-to-br ${strategy.color} border-transparent text-white shadow-xl`
              : isDark
                ? "bg-slate-800 border-white/10 text-white hover:border-white/20"
                : "bg-white border-gray-200 text-gray-900 hover:border-gray-300"
              }`}
          >
            <div className="text-center">
              <div className="text-5xl mb-3">{strategy.icon}</div>
              <h4 className="font-bold text-lg mb-2">{strategy.name}</h4>
              <p
                className={`text-sm ${selectedStrategy === strategy.type
                  ? "text-white/90"
                  : isDark
                    ? "text-gray-400"
                    : "text-gray-600"
                  }`}
              >
                {strategy.description}
              </p>
            </div>
            {selectedStrategy === strategy.type && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Strategy Form */}
      {selectedStrategy === "PRICE_TARGET" && (
        <PriceTargetForm tokens={tokens} wallets={wallets} loading={loading} />
      )}
      {selectedStrategy === "ACA" && (
        <ACAForm tokens={tokens} wallets={wallets} loading={loading} />
      )}
      {selectedStrategy === "GRID_TRADING" && (
        <GridTradingForm tokens={tokens} wallets={wallets} loading={loading} />
      )}
    </div>
  );
}
