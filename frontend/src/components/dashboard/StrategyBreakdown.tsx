// src/components/dashboard/StrategyBreakdown.tsx

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type StrategyDto = {
  type: "grid" | "dca" | "price-target" | "stop-loss-take-profit";
  investedAmount: string;
  isActive: boolean;
};

interface StrategyBreakdownProps {
  data?: StrategyDto[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

const TYPE_LABELS: Record<StrategyDto["type"], string> = {
  grid: "Grid Trading",
  dca: "DCA",
  "price-target": "Price Target",
  "stop-loss-take-profit": "SL/TP",
};

export default function StrategyBreakdown({ data }: StrategyBreakdownProps) {
  const isDark = useSelector(selectIsDark);

  const { pieData, totalInvested } = useMemo(() => {
    if (!data || data.length === 0) {
      return { pieData: [] as any[], totalInvested: 0 };
    }

    // Only active strategies for allocation
    const active = data.filter((s) => s.isActive);

    const sums: Record<string, number> = {};
    active.forEach((s) => {
      const key = s.type;
      const amt = Number(s.investedAmount || "0");
      if (!sums[key]) sums[key] = 0;
      sums[key] += amt;
    });

    const total = Object.values(sums).reduce((a, b) => a + b, 0);

    const pieData = Object.entries(sums).map(([type, value]) => ({
      name: TYPE_LABELS[type as StrategyDto["type"]] ?? type,
      type,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }));

    return { pieData, totalInvested: total };
  }, [data]);

  return (
    <div
      className={`p-6 rounded-2xl backdrop-blur-xl border ${
        isDark ? "bg-slate-800/50 border-white/10" : "bg-white border-gray-200"
      } shadow-lg`}
    >
      <h2
        className={`text-xl font-bold mb-6 flex items-center gap-2 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        <span>🎯</span>
        Strategy Allocation
      </h2>

      {pieData.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center">
          <p className={isDark ? "text-slate-400" : "text-gray-600"}>
            No active strategy allocation data
          </p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, _name: any, entry: any) => [
                  `${Number(value).toFixed(2)} ADA`,
                  `${entry.payload.name} (${entry.payload.percentage.toFixed(
                    1
                  )}%)`,
                ]}
                contentStyle={{
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  border: isDark ? "1px solid #334155" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-3 mt-4">
            {pieData.map((item, index) => (
              <div
                key={item.type}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span
                    className={`text-sm ${
                      isDark ? "text-slate-300" : "text-gray-700"
                    }`}
                  >
                    {item.name}
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {item.value.toFixed(2)} ADA • {item.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>

          <div
            className={`mt-4 pt-4 border-t ${
              isDark ? "border-slate-700" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-semibold ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Total Invested
              </span>
              <span
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {totalInvested.toFixed(2)} ADA
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
