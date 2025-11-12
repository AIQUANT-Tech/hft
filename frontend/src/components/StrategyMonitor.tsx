// src/components/StrategyMonitor.tsx

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const API_URL = "http://localhost:8080";

interface Strategy {
  id: string;
  name: string;
  tradingPair: string;
  side: string;
  triggerType: string;
  orderAmount: number;
  isActive: boolean;
  currentPrice: string;
  targetPrice: string;
  priceDifference: string;
  priceDifferencePercent: string;
  distanceToTarget: string;
  conditionMet: boolean;
  status: string;
  error?: string;
  lastUpdate?: string;
  orderCreated?: boolean;
}

interface ActivityLog {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error";
  message: string;
  strategyName?: string;
}

export default function StrategyMonitor() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [nextUpdateIn, setNextUpdateIn] = useState(5);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [strategyToDelete, setStrategyToDelete] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(true);

  const REFRESH_INTERVAL = 5000;
  const MAX_LOGS = 50; // Keep last 50 logs

  // ✅ Add activity log
  const addLog = (
    type: ActivityLog["type"],
    message: string,
    strategyName?: string
  ) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      message,
      strategyName,
    };
    setActivityLogs((prev) => [newLog, ...prev].slice(0, MAX_LOGS));
  };

  const fetchStrategies = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/strategy/live`);

      if (response.data.success) {
        const newStrategies = response.data.strategies;

        // ✅ Track changes and generate logs
        // Inside fetchStrategies() - this is what generates the logs:

        newStrategies.forEach((strategy: Strategy) => {
          const oldStrategy = strategies.find((s) => s.id === strategy.id);

          if (!oldStrategy) {
            // New strategy detected
            addLog("info", `Strategy monitoring started`, strategy.name);
          } else {
            // Compare states and generate logs

            // 1. Condition met changed
            if (strategy.conditionMet && !oldStrategy.conditionMet) {
              addLog(
                "success",
                `🎯 Target price reached! Current ${parseFloat(
                  strategy.currentPrice
                ).toFixed(6)} | Target ${parseFloat(
                  strategy.targetPrice
                ).toFixed(6)}`,
                strategy.name
              );
            }

            // 2. Order created
            if (strategy.orderCreated && !oldStrategy.orderCreated) {
              addLog(
                "success",
                `✅ Order created: ${strategy.side} ${strategy.orderAmount} ${
                  strategy.tradingPair.split("-")[0]
                }`,
                strategy.name
              );
            }

            // 3. Price changed significantly (>1%)
            const oldPrice = parseFloat(oldStrategy.currentPrice);
            const newPrice = parseFloat(strategy.currentPrice);
            if (Math.abs(newPrice - oldPrice) / oldPrice > 0.01) {
              const direction = newPrice > oldPrice ? "⬆️" : "⬇️";
              addLog(
                "info",
                `${direction} Price: ${newPrice.toFixed(6)} ADA (${
                  strategy.distanceToTarget
                } from target)`,
                strategy.name
              );
            }
          }
        });

        setStrategies(newStrategies);
        setError(null);
        setLastUpdateTime(new Date());
        setNextUpdateIn(5);

        // Log check completion
        if (newStrategies.length > 0) {
          addLog(
            "info",
            `🔍 Checked ${newStrategies.length} active strategy(ies)`
          );
        }
      } else {
        setError(response.data.error || "Failed to fetch strategies");
        addLog("error", response.data.error || "Failed to fetch strategies");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      const errorMsg = `Connection error: ${(err as Error).message}`;
      setError(errorMsg);
      addLog("error", errorMsg);
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
      const strategy = strategies.find((s) => s.id === id);
      await axios.post(`${API_URL}/api/strategy/stop/${id}`);
      toast.success("Strategy stopped");
      addLog("warning", "Strategy stopped by user", strategy?.name);
      fetchStrategies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to stop strategy");
      addLog("error", error.response?.data?.error || "Failed to stop strategy");
    }
  };

  const startStrategy = async (id: string) => {
    try {
      const strategy = strategies.find((s) => s.id === id);
      await axios.post(`${API_URL}/api/strategy/start/${id}`);
      toast.success("Strategy started");
      addLog("success", "Strategy started by user", strategy?.name);
      fetchStrategies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to start strategy");
      addLog(
        "error",
        error.response?.data?.error || "Failed to start strategy"
      );
    }
  };

  const deleteStrategy = async () => {
    if (!strategyToDelete) return;

    try {
      const strategy = strategies.find((s) => s.id === strategyToDelete);
      await axios.delete(`${API_URL}/api/strategy/${strategyToDelete}`);
      toast.success("Strategy deleted");
      addLog("warning", "Strategy deleted by user", strategy?.name);
      setShowDeleteModal(false);
      setStrategyToDelete(null);
      fetchStrategies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete strategy");
      addLog(
        "error",
        error.response?.data?.error || "Failed to delete strategy"
      );
    }
  };

  // ✅ Get log icon and color
  const getLogStyle = (type: ActivityLog["type"]) => {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Active Strategies
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 dark:text-gray-400">
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Active Strategies
        </h1>
        <div className="bg-red-50 dark:bg-red-900/50 border-2 border-red-300 dark:border-red-500 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
                Connection Error
              </p>
              <p className="text-red-600 dark:text-red-300">{error}</p>
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Active Strategies
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-white/10 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">📊</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Active Strategies
          </p>
          <p className="text-gray-600 dark:text-gray-400">
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Active Strategies
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Live indicator */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl shadow-md border border-gray-200 dark:border-white/10">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Next update in{" "}
              <span className="font-mono text-green-600 dark:text-green-400">
                {nextUpdateIn}s
              </span>
            </span>
          </div>

          {/* Activity log toggle */}
          <button
            onClick={() => setShowActivityLog(!showActivityLog)}
            className={`px-4 py-2.5 rounded-xl font-semibold transition-all shadow-md ${
              showActivityLog
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10"
            }`}
          >
            📋 Activity Log
          </button>

          {lastUpdateTime && (
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10">
              Updated: {lastUpdateTime.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Strategies + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategies Section */}
        <div
          className={`space-y-4 ${
            showActivityLog ? "lg:col-span-2" : "lg:col-span-3"
          }`}
        >
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-white/10 hover:shadow-xl transition-all"
            >
              {strategy.error ? (
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
              ) : (
                <>
                  {/* Strategy Header */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
                        <span className="text-xl">📈</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          {strategy.name}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {strategy.tradingPair}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                          strategy.orderCreated && strategy.isActive
                            ? "bg-green-500 text-white shadow-lg shadow-green-500/30 animate-pulse"
                            : strategy.isActive
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                            : "bg-gray-400 text-white"
                        }`}
                      >
                        {strategy.orderCreated
                          ? "🎯 Order Placed"
                          : strategy.isActive
                          ? "⚡ Active"
                          : "⏸️ Stopped"}
                      </span>

                      {/* Control Buttons */}
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

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-3 border border-green-200 dark:border-green-500/30">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Current Price
                      </p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        ₳{parseFloat(strategy.currentPrice).toFixed(6)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-3 border border-blue-200 dark:border-blue-500/30">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Target Price
                      </p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ₳{parseFloat(strategy.targetPrice).toFixed(6)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-500/10 dark:to-orange-500/10 rounded-xl p-3 border border-yellow-200 dark:border-yellow-500/30">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Distance
                      </p>
                      <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                        {strategy.distanceToTarget}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl p-3 border border-purple-200 dark:border-purple-500/30">
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

                  {/* Strategy Description */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-500/30">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Will{" "}
                      <span className="font-bold text-gray-900 dark:text-white">
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
                        ₳{parseFloat(strategy.targetPrice).toFixed(6)}
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* ✅ Activity Log Panel */}
        {showActivityLog && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 sticky top-6 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <h3 className="font-bold text-white">Activity Log</h3>
                </div>
                <button
                  onClick={() => setActivityLogs([])}
                  className="text-xs text-white/80 hover:text-white underline"
                >
                  Clear
                </button>
              </div>

              {/* Logs */}
              <div className="h-96 overflow-y-auto p-4 space-y-2">
                {activityLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No activity yet</p>
                    <p className="text-xs mt-1">Logs will appear here</p>
                  </div>
                ) : (
                  activityLogs.map((log) => {
                    const style = getLogStyle(log.type);
                    return (
                      <div
                        key={log.id}
                        className={`${style.bg} ${style.border} border rounded-lg p-3 text-xs transition-all hover:scale-102`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{style.icon}</span>
                          <div className="flex-1 min-w-0">
                            {log.strategyName && (
                              <p className="font-bold text-gray-900 dark:text-white text-xs mb-1">
                                {log.strategyName}
                              </p>
                            )}
                            <p className={`${style.text} leading-relaxed`}>
                              {log.message}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                              {log.timestamp.toLocaleTimeString()}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && strategyToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-gray-300 dark:border-white/10 shadow-2xl animate-slideUp">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Delete Strategy?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
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
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={deleteStrategy}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold rounded-xl transition-all hover:scale-105 shadow-lg shadow-red-500/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
