// src/components/dashboard/PortfolioChart.tsx

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PortfolioHistoryItem {
  date: string;
  totalValueAda: string;
  totalValueUsd: string;
  profitLoss: string;
}

interface PortfolioChartProps {
  data?: PortfolioHistoryItem[];
}

export default function PortfolioChart({ data }: PortfolioChartProps) {
  const isDark = useSelector(selectIsDark);
  const [timeframe, setTimeframe] = useState("1M");
  const [chartData, setChartData] = useState<any[]>([]);

  const timeframes = ["1W", "1M", "3M", "1Y", "All"];

  useEffect(() => {
    if (data && data.length > 0) {
      formatChartData(data, timeframe);
    }
  }, [data, timeframe]);

  const formatChartData = (
    historyData: PortfolioHistoryItem[],
    timeframe: string
  ) => {
    // Filter data based on timeframe
    const now = new Date();
    let filteredData = historyData;

    switch (timeframe) {
      case "1W":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredData = historyData.filter(
          (item) => new Date(item.date) >= weekAgo
        );
        break;
      case "1M":
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredData = historyData.filter(
          (item) => new Date(item.date) >= monthAgo
        );
        break;
      case "3M":
        const threeMonthsAgo = new Date(
          now.getTime() - 90 * 24 * 60 * 60 * 1000
        );
        filteredData = historyData.filter(
          (item) => new Date(item.date) >= threeMonthsAgo
        );
        break;
      case "1Y":
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filteredData = historyData.filter(
          (item) => new Date(item.date) >= yearAgo
        );
        break;
      case "All":
        filteredData = historyData;
        break;
    }

    // Format data for chart
    const formatted = filteredData.map((item) => {
      const dateObj = new Date(item.date);
      const formattedDate = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      const portfolioValue = parseFloat(item.totalValueAda);
      const profit = parseFloat(item.profitLoss);

      return {
        date: formattedDate,
        portfolio: parseFloat(portfolioValue.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
      };
    });

    setChartData(formatted);
  };

  // Loading skeleton
  if (!data || data.length === 0) {
    return (
      <div
        className={`p-6 rounded-2xl backdrop-blur-xl border ${
          isDark
            ? "bg-slate-800/50 border-white/10"
            : "bg-white border-gray-200"
        } shadow-lg`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className={`text-xl font-bold flex items-center gap-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            <span>📈</span>
            Portfolio Performance
          </h2>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <p className={isDark ? "text-slate-400" : "text-gray-600"}>
            No historical data available
          </p>
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
          <span>📈</span>
          Portfolio Performance
        </h2>

        <div className="flex gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                timeframe === tf
                  ? isDark
                    ? "bg-purple-500 text-white"
                    : "bg-blue-500 text-white"
                  : isDark
                  ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className={isDark ? "text-slate-400" : "text-gray-600"}>
            No data for selected timeframe
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#334155" : "#e5e7eb"}
            />
            <XAxis
              dataKey="date"
              stroke={isDark ? "#94a3b8" : "#6b7280"}
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke={isDark ? "#94a3b8" : "#6b7280"}
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => `${value.toFixed(0)}₳`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                border: isDark ? "1px solid #334155" : "1px solid #e5e7eb",
                borderRadius: "8px",
                color: isDark ? "#f1f5f9" : "#1f2937",
              }}
              formatter={(value: any) => [`${value.toFixed(2)}₳`, ""]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#3b82f6", r: 4 }}
              name="Portfolio Value"
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "#10b981", r: 3 }}
              name="Profit/Loss"
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500"></div>
          <span className={isDark ? "text-slate-400" : "text-gray-600"}>
            Portfolio Value
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-500 border-dashed"></div>
          <span className={isDark ? "text-slate-400" : "text-gray-600"}>
            Profit/Loss
          </span>
        </div>
      </div>

      {/* Summary stats below chart */}
      {chartData.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Current Value
              </p>
              <p
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {chartData[chartData.length - 1]?.portfolio.toFixed(2)}₳
              </p>
            </div>
            <div>
              <p
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Total Profit
              </p>
              <p
                className={`text-lg font-bold ${
                  chartData[chartData.length - 1]?.profit >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {chartData[chartData.length - 1]?.profit >= 0 ? "+" : ""}
                {chartData[chartData.length - 1]?.profit.toFixed(2)}₳
              </p>
            </div>
            <div>
              <p
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Period
              </p>
              <p
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {chartData.length} days
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
