// src/components/dashboard/ActiveStrategies.tsx

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";
import { Link } from "react-router-dom";

type StrategyDto = {
  name: string;
  type: string;
  profitLoss: string; // example: "+45₳"
  status: "active" | "waiting" | "paused";
  progress: number; // 0-100
  positive: boolean; // true if profitLoss positive
};

interface ActiveStrategiesProps {
  data?: StrategyDto[];
}

export default function ActiveStrategies({ data }: ActiveStrategiesProps) {
  const isDark = useSelector(selectIsDark);

  // If no data, show loading placeholder or empty state
  const strategies = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((s) => ({
      name: s.name,
      type: s.type,
      pnl: s.profitLoss,
      status:
        s.status === "active"
          ? "active"
          : s.status === "waiting"
          ? "waiting"
          : "paused",
      progress: s.progress,
      positive: s.positive,
    }));
  }, [data]);

  if (strategies.length === 0) {
    return (
      <div
        className={`p-6 rounded-2xl backdrop-blur-xl border ${
          isDark
            ? "bg-slate-800/50 border-white/10"
            : "bg-white border-gray-200"
        } shadow-lg`}
      >
        <div className="text-center py-10 text-gray-500">
          No active strategies to display.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-6 rounded-2xl backdrop-blur-xl border ${
        isDark ? "bg-slate-800/50 border-white/10" : "bg-white border-gray-200"
      } shadow-lg`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2
          className={`text-xl font-bold flex items-center gap-2 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          <span>🎯</span>
          Active Strategies
        </h2>
        <div className="flex gap-3">
          <Link
            to="/strategies/create"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              isDark
                ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            }`}
          >
            + Create New Strategy
          </Link>
          <Link
            to="/strategies"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isDark
                ? "text-blue-400 hover:text-blue-300"
                : "text-blue-600 hover:text-blue-700"
            }`}
          >
            View All →
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className={`border-b ${
                isDark ? "border-slate-700" : "border-gray-200"
              }`}
            >
              <th
                className={`text-left py-3 px-4 text-sm font-semibold ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Strategy Name
              </th>
              <th
                className={`text-left py-3 px-4 text-sm font-semibold ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Type
              </th>
              <th
                className={`text-right py-3 px-4 text-sm font-semibold ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                P&L
              </th>
              <th
                className={`text-center py-3 px-4 text-sm font-semibold ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Status
              </th>
              <th
                className={`text-left py-3 px-4 text-sm font-semibold ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Progress
              </th>
              <th
                className={`text-right py-3 px-4 text-sm font-semibold ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((strategy, index) => (
              <tr
                key={index}
                className={`border-b transition-colors ${
                  isDark
                    ? "border-slate-700 hover:bg-slate-700/50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <td
                  className={`py-4 px-4 font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {strategy.name}
                </td>
                <td
                  className={`py-4 px-4 ${
                    isDark ? "text-slate-300" : "text-gray-700"
                  }`}
                >
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      isDark
                        ? "bg-slate-700 text-slate-300"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {strategy.type}
                  </span>
                </td>
                <td
                  className={`text-right py-4 px-4 font-bold ${
                    strategy.positive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {strategy.pnl}
                </td>
                <td className="text-center py-4 px-4">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      strategy.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                    }`}
                  >
                    {strategy.status === "active" ? "🟢 ON" : "⏳ Wait"}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex-1 h-2 rounded-full overflow-hidden ${
                        isDark ? "bg-slate-700" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          isDark
                            ? "bg-gradient-to-r from-purple-500 to-pink-500"
                            : "bg-gradient-to-r from-blue-500 to-cyan-500"
                        }`}
                        style={{ width: `${strategy.progress}%` }}
                      ></div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        isDark ? "text-slate-400" : "text-gray-600"
                      }`}
                    >
                      {strategy.progress}%
                    </span>
                  </div>
                </td>
                <td className="text-right py-4 px-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className={`p-2 rounded-lg transition-all ${
                        isDark
                          ? "bg-slate-700 hover:bg-slate-600"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                      title="Pause"
                    >
                      ⏸
                    </button>
                    <button
                      className={`p-2 rounded-lg transition-all ${
                        isDark
                          ? "bg-slate-700 hover:bg-slate-600"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                      title="Settings"
                    >
                      ⚙️
                    </button>
                    <button
                      className="p-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 transition-all"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
