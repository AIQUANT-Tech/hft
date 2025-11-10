// frontend/src/components/StrategyMonitor.tsx

import { useEffect, useState } from "react";

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
}

export default function StrategyMonitor() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [nextUpdateIn, setNextUpdateIn] = useState(5);
  const REFRESH_INTERVAL = 5000; // 5 seconds

  const fetchStrategies = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/strategy/live");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setStrategies(data.strategies);
        setError(null);
        setLastUpdateTime(new Date());
        setNextUpdateIn(5);
      } else {
        setError(data.error || "Failed to fetch strategies");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(`Connection error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
    const interval = setInterval(fetchStrategies, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // ✅ Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNextUpdateIn((prev) => {
        if (prev <= 1) return 5;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold text-white mb-6">
          Active Strategies
        </h1>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <p className="text-gray-400">Loading strategies...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold text-white mb-6">
          Active Strategies
        </h1>
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6">
          <p className="text-red-400 font-semibold">Error:</p>
          <p className="text-red-300 mt-2">{error}</p>
          <button
            onClick={fetchStrategies}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold text-white mb-6">
          Active Strategies
        </h1>
        <div className="bg-gray-800 rounded-lg p-6">
          <p className="text-gray-400">No active strategies found.</p>
          <p className="text-sm text-gray-500 mt-2">
            Create a strategy to see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Active Strategies</h1>
        <div className="flex items-center gap-4">
          {/* ✅ Update Timer */}
          <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </div>
            <span className="text-sm text-gray-400">
              Next update in{" "}
              <span className="font-mono text-green-400">{nextUpdateIn}s</span>
            </span>
          </div>
          {/* ✅ Last Update Time */}
          {lastUpdateTime && (
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdateTime.toLocaleTimeString()}
            </div>
          )}
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-400">Connected</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700"
          >
            {strategy.error ? (
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {strategy.name}
                </h2>
                <p className="text-sm text-red-400 mt-2">⚠️ {strategy.error}</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {strategy.name}
                    </h2>
                    <p className="text-gray-400">{strategy.tradingPair}</p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        strategy.conditionMet
                          ? "bg-green-500/20 text-green-400 border border-green-500 animate-pulse"
                          : "bg-yellow-500/20 text-yellow-400 border border-yellow-500"
                      }`}
                    >
                      {strategy.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500">
                      Active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <p className="text-xs text-gray-400 mb-1">Current Price</p>
                    <p className="text-xl font-bold text-white">
                      {parseFloat(strategy.currentPrice).toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-500">ADA</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <p className="text-xs text-gray-400 mb-1">Target Price</p>
                    <p className="text-xl font-bold text-white">
                      {parseFloat(strategy.targetPrice).toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-500">ADA</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <p className="text-xs text-gray-400 mb-1">Difference</p>
                    <p
                      className={`text-xl font-bold ${
                        parseFloat(strategy.priceDifference) > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {strategy.priceDifferencePercent}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {parseFloat(strategy.priceDifference).toFixed(6)} ADA
                    </p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <p className="text-xs text-gray-400 mb-1">Distance</p>
                    <p className="text-xl font-bold text-white">
                      {parseFloat(strategy.distanceToTarget).toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-500">ADA away</p>
                  </div>
                </div>

                <div className="mt-4 bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <p className="text-sm text-gray-300">
                    Will{" "}
                    <span className="font-semibold text-white">
                      {strategy.side}
                    </span>{" "}
                    <span className="font-semibold text-green-400">
                      {strategy.orderAmount}
                    </span>{" "}
                    <span className="font-semibold">
                      {strategy.tradingPair.split("-")[0]}
                    </span>{" "}
                    when price{" "}
                    <span className="font-semibold text-yellow-400">
                      {strategy.triggerType === "ABOVE"
                        ? "rises above"
                        : "falls below"}
                    </span>{" "}
                    <span className="font-semibold text-blue-400">
                      {parseFloat(strategy.targetPrice).toFixed(6)} ADA
                    </span>
                  </p>
                </div>

                {strategy.lastUpdate && (
                  <p className="text-xs text-gray-500 mt-3">
                    Strategy last checked:{" "}
                    {new Date(strategy.lastUpdate).toLocaleTimeString()}
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
