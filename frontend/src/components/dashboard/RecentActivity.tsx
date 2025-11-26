// src/components/dashboard/RecentActivity.tsx

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";

type ActivityDto = {
  action: "BUY" | "SELL" | "CREATE" | "PAUSE" | "RESUME" | "DELETE";
  status: "pending" | "completed" | "failed";
  strategyName?: string;
  tradingPair?: string;
  amount?: string;
  price?: string;
  profitLoss?: string;
  txHash?: string;
  details?: string;
  createdAt: string; // ISO string from DB
};

interface RecentActivityProps {
  data?: ActivityDto[];
}

export default function RecentActivity({ data }: RecentActivityProps) {
  const isDark = useSelector(selectIsDark);

  const activities = useMemo(() => {
    if (!data || data.length === 0) return [];

    const formatTimeAgo = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffMin < 1) return "Just now";
      if (diffMin < 60)
        return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
      if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
      return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
    };

    const getIcon = (status: ActivityDto["status"]) => {
      if (status === "completed") return "✅";
      if (status === "pending") return "⏳";
      return "⚠️";
    };

    return data.map((a) => {
      const time = formatTimeAgo(a.createdAt);
      const icon = getIcon(a.status);

      let mainDetails = a.details;
      if (!mainDetails && a.amount && a.price && a.tradingPair) {
        mainDetails = `${a.action === "BUY" ? "Bought" : "Sold"} ${a.amount} ${
          a.tradingPair
        } at ${a.price}`;
        if (a.profitLoss) {
          const plNum = Number(a.profitLoss);
          const plPrefix = plNum >= 0 ? "+" : "";
          mainDetails += ` • P&L: ${plPrefix}${plNum.toFixed(2)}₳`;
        }
      }

      return {
        time,
        icon,
        action: a.action,
        status: a.status,
        strategy: a.strategyName || a.tradingPair || "Unknown strategy",
        details: mainDetails || "No details",
      };
    });
  }, [data]);

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
          <span>📊</span>
          Recent Activity
        </h2>
        <button
          className={`text-sm font-semibold transition-colors ${
            isDark
              ? "text-blue-400 hover:text-blue-300"
              : "text-blue-600 hover:text-blue-700"
          }`}
        >
          View All →
        </button>
      </div>

      {!activities || activities.length === 0 ? (
        <div className="h-24 flex items-center justify-center">
          <p className={isDark ? "text-slate-400" : "text-gray-600"}>
            No recent activity
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-1">
                  <span className="text-xl">{activity.icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p
                      className={`text-xs ${
                        isDark ? "text-slate-400" : "text-gray-500"
                      }`}
                    >
                      ⏰ {activity.time}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        activity.action === "BUY"
                          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                          : activity.action === "SELL"
                          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                          : "bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-100"
                      }`}
                    >
                      {activity.action}
                    </span>
                  </div>

                  <p
                    className={`text-sm font-semibold mb-1 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {activity.status === "completed"
                      ? `${activity.action} executed`
                      : activity.status === "pending"
                      ? "ORDER pending"
                      : "ORDER failed"}{" "}
                    • {activity.strategy}
                  </p>

                  <p
                    className={`text-xs ${
                      isDark ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    {activity.details}
                  </p>
                </div>
              </div>

              {index < activities.length - 1 && (
                <div
                  className={`my-4 border-b ${
                    isDark ? "border-slate-700" : "border-gray-200"
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
