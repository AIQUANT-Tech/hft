// src/components/StrategyMonitor.tsx

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { io, Socket } from "socket.io-client";
import { selectIsDark } from "@/redux/themeSlice";

export const API_URL = "http://localhost:8080";

// ✅ Updated to support all strategy types
interface BaseStrategy {
  id: string;
  name: string;
  tradingPair: string;
  isActive: boolean;
  error?: string;
  lastUpdate?: string;
}

interface PriceTargetStrategy extends BaseStrategy {
  strategy: "PriceTarget";
  side: string;
  triggerType: string;
  orderAmount: number;
  currentPrice: number;
  targetPrice: number;
  priceDifference: number;
  priceDifferencePercent: number;
  distanceToTarget: number;
  conditionMet: boolean;
  orderCreated?: boolean;
}

interface ACAStrategy extends BaseStrategy {
  type: "ACA";
  investmentAmount: number;
  intervalMinutes: number;
  runsExecuted: number;
  totalRuns: number | string;
  lastBuyTime: string;
  nextBuyTime: string;
  timeUntilNextBuy: string;
  progress: string;
  executeOnce: boolean;
}

interface GridStrategy extends BaseStrategy {
  type: "Grid Trading";
  lowerPrice: number;
  upperPrice: number;
  gridLevels: number;
  gridSpacing: string;
  investmentPerGrid: number;
  activeOrders: number;
  totalProfit: string;
  profitPerGrid: string;
  executeOnce: boolean;
}

type Strategy = PriceTargetStrategy | ACAStrategy | GridStrategy;

export interface LogMessage {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error";
  message: string;
  strategyName?: string;
  category?: "strategy" | "order" | "wallet" | "system";
}

// ✅ Helper to format prices with full decimals
const formatPrice = (price: string | number): string => {
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  if (!priceNum || priceNum === 0) return "N/A";
  return priceNum.toFixed(12).replace(/\.?0+$/, "");
};

interface StrategyMonitorProps {
  showLogs?: boolean;
}

const StrategyMonitor: React.FC<StrategyMonitorProps> = ({
  showLogs = true,
}) => {
  const isDark = useSelector(selectIsDark);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [nextUpdateIn, setNextUpdateIn] = useState(5);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [strategyToDelete, setStrategyToDelete] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<LogMessage[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const REFRESH_INTERVAL = 5000;
  const MAX_LOGS = 100;

  useEffect(() => {
    // ✅ Prevent multiple connections
    if (socketRef.current?.connected) {
      console.log("⚠️ Socket already connected, skipping...");
      return;
    }

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to backend logs");
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from backend logs, reason:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error.message);
      setIsConnected(false);
    });

    socket.on("log:history", (history: LogMessage[]) => {
      console.log(`📜 Received ${history.length} log messages from history`);
      setActivityLogs(history);
    });

    socket.on("log:message", (log: LogMessage) => {
      setActivityLogs((prev) => [log, ...prev].slice(0, MAX_LOGS));
    });

    return () => {
      console.log("🧹 Cleaning up socket connection");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("log:history");
      socket.off("log:message");
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/strategy/live`);

      if (response.data.success) {
        const newStrategies = response.data.strategies;
        setStrategies(newStrategies);
        setError(null);
        setLastUpdateTime(new Date());
        setNextUpdateIn(5);
      } else {
        setError(response.data.error || "Failed to fetch strategies");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      const errorMsg = `Connection error: ${(err as Error).message}`;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
    const interval = setInterval(fetchStrategies, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextUpdateIn((prev) => (prev <= 1 ? 5 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const stopStrategy = async (id: string) => {
    try {
      await axios.post(`${API_URL}/api/strategy/stop/${id}`);
      toast.success("Strategy stopped");
      fetchStrategies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to stop strategy");
    }
  };

  const startStrategy = async (id: string) => {
    try {
      await axios.post(`${API_URL}/api/strategy/start/${id}`);
      toast.success("Strategy started");
      fetchStrategies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to start strategy");
    }
  };

  const deleteStrategy = async () => {
    if (!strategyToDelete) return;

    try {
      await axios.delete(`${API_URL}/api/strategy/${strategyToDelete}`);
      toast.success("Strategy deleted");
      setShowDeleteModal(false);
      setStrategyToDelete(null);
      fetchStrategies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete strategy");
    }
  };

  const getLogStyle = (type: LogMessage["type"]) => {
    switch (type) {
      case "success":
        return {
          icon: "✅",
          bg: "bg-green-50 dark:bg-green-500/10",
          border: "border-green-200 dark:border-green-500/30",
          text: "text-green-700 dark:text-green-400",
        };
      case "error":
        return {
          icon: "❌",
          bg: "bg-red-50 dark:bg-red-500/10",
          border: "border-red-200 dark:border-red-500/30",
          text: "text-red-700 dark:text-red-400",
        };
      case "warning":
        return {
          icon: "⚠️",
          bg: "bg-yellow-50 dark:bg-yellow-500/10",
          border: "border-yellow-200 dark:border-yellow-500/30",
          text: "text-yellow-700 dark:text-yellow-400",
        };
      default:
        return {
          icon: "ℹ️",
          bg: "bg-blue-50 dark:bg-blue-500/10",
          border: "border-blue-200 dark:border-blue-500/30",
          text: "text-blue-700 dark:text-blue-400",
        };
    }
  };

  const getCategoryBadge = (category?: string) => {
    const badges = {
      strategy: { emoji: "🎯", label: "Strategy" },
      order: { emoji: "📝", label: "Order" },
      wallet: { emoji: "👛", label: "Wallet" },
      system: { emoji: "⚙️", label: "System" },
    };
    return (
      badges[category as keyof typeof badges] || { emoji: "ℹ️", label: "Info" }
    );
  };

  const renderStrategyContent = (strategy: Strategy) => {
    if (strategy.error) {
      return (
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {strategy.name}
            </h2>
            <p className="text-red-600 dark:text-red-400 mt-2">
              ⚠️ {strategy.error}
            </p>
          </div>
        </div>
      );
    }

    if ("strategy" in strategy && strategy.strategy === "PriceTarget") {
      return (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-3 border border-green-200 dark:border-green-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Current Price
              </p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                ₳{formatPrice(strategy.currentPrice)}
              </p>
            </div>
            <div className="bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-3 border border-blue-200 dark:border-blue-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Target Price
              </p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                ₳{formatPrice(strategy.targetPrice)}
              </p>
            </div>
            <div className="bg-linear-to-br from-yellow-50 to-orange-50 dark:from-yellow-500/10 dark:to-orange-500/10 rounded-xl p-3 border border-yellow-200 dark:border-yellow-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Distance
              </p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {strategy.priceDifferencePercent.toFixed(2)}%
              </p>
            </div>
            <div className="bg-linear-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl p-3 border border-purple-200 dark:border-purple-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Status
              </p>
              <p
                className={`text-sm font-bold ${
                  strategy.conditionMet
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {strategy.conditionMet ? "✅ READY" : "⏳ WAITING"}
              </p>
            </div>
          </div>

          <div className="bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-500/30">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Will{" "}
              <span
                className={`font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {strategy.side}
              </span>{" "}
              <span className="font-bold text-green-600 dark:text-green-400">
                {strategy.orderAmount}
              </span>{" "}
              <span className="font-bold">
                {strategy.tradingPair.split("-")[0]}
              </span>{" "}
              when price{" "}
              <span className="font-bold text-yellow-600 dark:text-yellow-400">
                {strategy.triggerType === "ABOVE"
                  ? "rises above"
                  : "falls below"}
              </span>{" "}
              <span className="font-bold text-blue-600 dark:text-blue-400">
                ₳{formatPrice(strategy.targetPrice)}
              </span>
            </p>
          </div>
        </>
      );
    }

    if ("type" in strategy && strategy.type === "ACA") {
      return (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-3 border border-green-200 dark:border-green-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Per Buy
              </p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                ₳{strategy.investmentAmount}
              </p>
            </div>
            <div className="bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-3 border border-blue-200 dark:border-blue-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Interval
              </p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {strategy.intervalMinutes}m
              </p>
            </div>
            <div className="bg-linear-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl p-3 border border-purple-200 dark:border-purple-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Progress
              </p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {strategy.progress}
              </p>
            </div>
            <div className="bg-linear-to-br from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/10 rounded-xl p-3 border border-orange-200 dark:border-orange-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Next Buy
              </p>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {strategy.timeUntilNextBuy}
              </p>
            </div>
          </div>

          <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-4 border border-green-200 dark:border-green-500/30">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              📊 <strong>ADA Cost Averaging:</strong> Buys{" "}
              <span className="font-bold text-green-600 dark:text-green-400">
                ₳{strategy.investmentAmount}
              </span>{" "}
              of {strategy.tradingPair.split("-")[0]} every{" "}
              <span className="font-bold">
                {strategy.intervalMinutes} minutes
              </span>
              {strategy.totalRuns !== "Unlimited" && (
                <span> for {strategy.totalRuns} total buys</span>
              )}
            </p>
          </div>
        </>
      );
    }

    if ("type" in strategy && strategy.type === "Grid Trading") {
      return (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-linear-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl p-3 border border-purple-200 dark:border-purple-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Price Range
              </p>
              <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                ₳{formatPrice(strategy.lowerPrice)} - ₳
                {formatPrice(strategy.upperPrice)}
              </p>
            </div>
            <div className="bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-3 border border-blue-200 dark:border-blue-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Grid Levels
              </p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {strategy.gridLevels}
              </p>
            </div>
            <div className="bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-3 border border-green-200 dark:border-green-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Active Orders
              </p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {strategy.activeOrders}
              </p>
            </div>
            <div className="bg-linear-to-br from-yellow-50 to-orange-50 dark:from-yellow-500/10 dark:to-orange-500/10 rounded-xl p-3 border border-yellow-200 dark:border-yellow-500/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Total Profit
              </p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                ₳{strategy.totalProfit}
              </p>
            </div>
          </div>

          <div className="bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl p-4 border border-purple-200 dark:border-purple-500/30">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              📊 <strong>Grid Trading:</strong> {strategy.gridLevels} levels
              between ₳{formatPrice(strategy.lowerPrice)} - ₳
              {formatPrice(strategy.upperPrice)}, investing{" "}
              <span className="font-bold text-green-600 dark:text-green-400">
                ₳{strategy.investmentPerGrid}
              </span>{" "}
              per grid
            </p>
          </div>
        </>
      );
    }

    return null;
  };

  const getStrategyIcon = (strategy: Strategy) => {
    if ("strategy" in strategy) return "🎯";
    if ("type" in strategy && strategy.type === "ACA") return "💰";
    if ("type" in strategy && strategy.type === "Grid Trading") return "📊";
    return "📈";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Active Strategies
        </h1>
        <div
          className={`rounded-2xl p-8 shadow-lg border ${
            isDark ? "bg-gray-800 border-white/10" : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              Loading strategies...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Active Strategies
        </h1>
        <div
          className={`border-2 rounded-2xl p-6 shadow-lg ${
            isDark ? "bg-red-900/50 border-red-500" : "bg-red-50 border-red-300"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <p
                className={`text-lg font-bold mb-2 ${
                  isDark ? "text-red-400" : "text-red-700"
                }`}
              >
                Connection Error
              </p>
              <p className={isDark ? "text-red-300" : "text-red-600"}>
                {error}
              </p>
              <button
                onClick={fetchStrategies}
                className="mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-white font-semibold transition-all hover:scale-105"
              >
                🔄 Retry Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Active Strategies
        </h1>
        <div
          className={`rounded-2xl p-8 shadow-lg border text-center ${
            isDark ? "bg-gray-800 border-white/10" : "bg-white border-gray-200"
          }`}
        >
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 ${
              isDark ? "bg-slate-700" : "bg-gray-100"
            }`}
          >
            <span className="text-5xl">📊</span>
          </div>
          <p
            className={`text-xl font-bold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            No Active Strategies
          </p>
          <p className={isDark ? "text-gray-400" : "text-gray-600"}>
            Create a strategy to start automated trading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Active Strategies
        </h1>
        {showLogs && (
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-md border ${
                isDark
                  ? "bg-gray-800 border-white/10"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
              <span
                className={`text-sm font-medium ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Next update in{" "}
                <span
                  className={`font-mono ${
                    isDark ? "text-green-400" : "text-green-600"
                  }`}
                >
                  {nextUpdateIn}s
                </span>
              </span>
            </div>

            <button
              onClick={() => setShowActivityLog(!showActivityLog)}
              className={`px-4 py-2.5 rounded-xl font-semibold transition-all shadow-md ${
                showActivityLog
                  ? "bg-linear-to-r from-blue-500 to-cyan-500 text-white"
                  : isDark
                  ? "bg-gray-800 text-gray-300 border border-white/10"
                  : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              📋 Activity Log
            </button>

            {lastUpdateTime && (
              <div
                className={`text-xs px-3 py-2 rounded-lg border ${
                  isDark
                    ? "text-gray-400 bg-gray-800 border-white/10"
                    : "text-gray-500 bg-white border-gray-200"
                }`}
              >
                Updated: {lastUpdateTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className={`space-y-4 ${
            showActivityLog ? "lg:col-span-2" : "lg:col-span-3"
          }`}
        >
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className={`rounded-2xl shadow-lg p-6 border hover:shadow-xl transition-all ${
                isDark
                  ? "bg-linear-to-br from-gray-800 to-gray-900 border-white/10"
                  : "bg-linear-to-br from-white to-gray-50 border-gray-200"
              }`}
            >
              {/* Strategy Header */}
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
                    <span className="text-xl">{getStrategyIcon(strategy)}</span>
                  </div>
                  <div>
                    <h2
                      className={`text-xl font-bold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {strategy.name}
                    </h2>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {strategy.tradingPair}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      strategy.isActive
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                        : "bg-gray-400 text-white"
                    }`}
                  >
                    {strategy.isActive ? "⚡ Active" : "⏸️ Stopped"}
                  </span>

                  {strategy.isActive ? (
                    <button
                      onClick={() => stopStrategy(strategy.id)}
                      className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-md"
                    >
                      ⏸️ Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => startStrategy(strategy.id)}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-md"
                    >
                      ▶️ Start
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setStrategyToDelete(strategy.id);
                      setShowDeleteModal(true);
                    }}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-md"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Strategy Content */}
              {renderStrategyContent(strategy)}
            </div>
          ))}
        </div>

        {/* Activity Log */}
        {showActivityLog && showLogs && (
          <div className="lg:col-span-1">
            <div
              className={`rounded-2xl shadow-lg border sticky top-6 overflow-hidden ${
                isDark
                  ? "bg-gray-800 border-white/10"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="bg-linear-to-r from-blue-500 to-cyan-500 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <h3 className="font-bold text-white">Live Backend Logs</h3>
                  {isConnected ? (
                    <div
                      className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                      title="Connected"
                    ></div>
                  ) : (
                    <div
                      className="w-2 h-2 bg-red-400 rounded-full"
                      title="Disconnected"
                    ></div>
                  )}
                </div>
                <button
                  onClick={() => setActivityLogs([])}
                  className="text-xs text-white/80 hover:text-white underline"
                >
                  Clear
                </button>
              </div>

              <div className="h-96 overflow-y-auto p-4 space-y-2">
                {activityLogs.length === 0 ? (
                  <div
                    className={`text-center py-8 ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <p className="text-sm">No logs yet</p>
                    <p className="text-xs mt-1">
                      {isConnected
                        ? "Waiting for backend events..."
                        : "Connecting to backend..."}
                    </p>
                  </div>
                ) : (
                  activityLogs.map((log) => {
                    const style = getLogStyle(log.type);
                    const categoryBadge = getCategoryBadge(log.category);

                    return (
                      <div
                        key={log.id}
                        className={`${style.bg} ${style.border} border rounded-lg p-3 text-xs transition-all hover:scale-[1.02]`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{style.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {log.strategyName && (
                                <p className="font-bold text-gray-900 dark:text-white text-xs">
                                  {log.strategyName}
                                </p>
                              )}
                              {log.category && (
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                  {categoryBadge.emoji} {categoryBadge.label}
                                </span>
                              )}
                            </div>
                            <p
                              className={`${style.text} leading-relaxed wrap-break-word`}
                            >
                              {log.message}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && strategyToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl p-8 max-w-md w-full border shadow-2xl ${
              isDark
                ? "bg-slate-900 border-white/10"
                : "bg-white border-gray-300"
            }`}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3
                className={`text-2xl font-bold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Delete Strategy?
              </h3>
              <p
                className={`text-sm ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                This will permanently delete the strategy and any pending
                orders.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setStrategyToDelete(null);
                }}
                className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all ${
                  isDark
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={deleteStrategy}
                className="flex-1 px-6 py-3 bg-linear-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold rounded-xl transition-all hover:scale-105 shadow-lg shadow-red-500/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyMonitor;
