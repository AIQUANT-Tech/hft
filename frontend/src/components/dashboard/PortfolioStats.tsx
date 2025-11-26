// src/components/dashboard/PortfolioStats.tsx

import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";

interface PortfolioStatsProps {
  data?: {
    totalValueAda: string;
    totalValueUsd: string;
    totalGainLoss: string;
    totalGainLossPercent: string;
    todayProfit: string;
    todayProfitPercent: string;
    activeStrategiesCount: number;
  };
}

export default function PortfolioStats({ data }: PortfolioStatsProps) {
  const isDark = useSelector(selectIsDark);

  // If no data, show loading skeleton or default values
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`p-6 rounded-2xl backdrop-blur-xl border animate-pulse ${
              isDark
                ? "bg-slate-800/50 border-white/10"
                : "bg-white border-gray-200"
            } shadow-lg`}
          >
            <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      icon: "💼",
      label: "Total Portfolio",
      value: `$${parseFloat(data.totalValueUsd).toFixed(2)}`,
      subValue: `${parseFloat(data.totalValueAda).toFixed(2)} ADA`,
      change: "+2.5%", // Calculate from historical data
      changeLabel: "vs. Yesterday",
      positive: true,
    },
    {
      icon: "📈",
      label: "Total Gain/Loss",
      value: `${parseFloat(data.totalGainLoss) >= 0 ? "+" : ""}${parseFloat(
        data.totalGainLoss
      ).toFixed(2)} ADA`,
      subValue: `${
        parseFloat(data.totalGainLossPercent) >= 0 ? "+" : ""
      }${parseFloat(data.totalGainLossPercent).toFixed(2)}%`,
      change: `${
        parseFloat(data.totalGainLossPercent) >= 0 ? "+" : ""
      }${parseFloat(data.totalGainLossPercent).toFixed(2)}%`,
      changeLabel: "vs. Initial",
      positive: parseFloat(data.totalGainLoss) >= 0,
    },
    {
      icon: "💰",
      label: "Profit Today",
      value: `${parseFloat(data.todayProfit) >= 0 ? "+" : ""}${parseFloat(
        data.todayProfit
      ).toFixed(2)} ADA`,
      subValue: `${
        parseFloat(data.todayProfitPercent) >= 0 ? "+" : ""
      }${parseFloat(data.todayProfitPercent).toFixed(2)}%`,
      change: `${
        parseFloat(data.todayProfitPercent) >= 0 ? "+" : ""
      }${parseFloat(data.todayProfitPercent).toFixed(2)}%`,
      changeLabel: "vs. Yesterday",
      positive: parseFloat(data.todayProfit) >= 0,
    },
    {
      icon: "📊",
      label: "Active Strategies",
      value: data.activeStrategiesCount.toString(),
      subValue: "View All",
      change: "+2", // Could calculate from historical data
      changeLabel: "This Week",
      positive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`p-6 rounded-2xl backdrop-blur-xl border transition-all hover:scale-105 ${
            isDark
              ? "bg-slate-800/50 border-white/10"
              : "bg-white border-gray-200"
          } shadow-lg`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">{stat.icon}</span>
            <span
              className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                stat.positive
                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
              }`}
            >
              {stat.change} {stat.positive ? "↗️" : "↘️"}
            </span>
          </div>

          <h3
            className={`text-sm font-medium mb-2 ${
              isDark ? "text-slate-400" : "text-gray-600"
            }`}
          >
            {stat.label}
          </h3>

          <p
            className={`text-2xl font-bold mb-1 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {stat.value}
          </p>

          <p
            className={`text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}
          >
            {stat.subValue}
          </p>

          <div
            className={`mt-3 pt-3 border-t text-xs ${
              isDark
                ? "border-slate-700 text-slate-500"
                : "border-gray-200 text-gray-500"
            }`}
          >
            {stat.changeLabel}
          </div>
        </div>
      ))}
    </div>
  );
}
