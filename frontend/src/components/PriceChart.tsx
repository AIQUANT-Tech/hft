import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { fetchTokenPriceHistory } from "../redux/priceSlice";

interface PriceChartProps {
  tokenId: string;
  days?: number;
}

type ChartType = "line" | "area" | "candle";
type TimeInterval = 7 | 30 | 90 | 365;

const PriceChart: React.FC<PriceChartProps> = ({ tokenId, days = 30 }) => {
  const dispatch = useAppDispatch();
  const { currentToken, priceHistory, loading, error } = useAppSelector(
    (state) => state.price
  );

  const [chartType, setChartType] = useState<ChartType>("area");
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(
    days as TimeInterval
  );

  useEffect(() => {
    if (tokenId) {
      dispatch(fetchTokenPriceHistory({ tokenId, days: timeInterval }));
    }
  }, [tokenId, timeInterval, dispatch]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400 text-lg">Loading price history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 px-6">
        <div className="max-w-md mx-auto p-6 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <p className="text-red-400 font-bold text-xl mb-3">
            ⚠️ Unable to Load Chart
          </p>
          <p className="text-red-300 mb-4">{error}</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            This token may not be listed on CoinGecko yet, or the ticker mapping
            needs to be updated.
          </p>
        </div>
      </div>
    );
  }

  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className="text-center py-20 px-6">
        <div className="max-w-md mx-auto p-6 bg-slate-700/30 border border-white/10 rounded-2xl">
          <p className="text-gray-400 text-lg">
            📊 No price data available for this token
          </p>
          <p className="text-gray-500 text-sm mt-2">
            This token may not be listed on CoinGecko yet
          </p>
        </div>
      </div>
    );
  }

  // Format data for chart
  const chartData = priceHistory.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    price: parseFloat(point.price.toFixed(12)),
    volume: point.volume ? point.volume / 1000000 : 0,
  }));

  // Calculate price change
  const firstPrice = chartData[0]?.price || 0;
  const lastPrice = chartData[chartData.length - 1]?.price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = ((priceChange / firstPrice) * 100).toFixed(2);
  const isPositive = priceChange >= 0;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-blue-500/30 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">
            {payload[0].payload.timestamp}
          </p>
          <p className="text-blue-400 text-sm">
            Price: ${payload[0].value.toFixed(12)}
          </p>
          {payload[1] && (
            <p className="text-purple-400 text-sm">
              Volume: ${payload[1].value.toFixed(2)}M
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Render chart based on type
  const renderChart = () => {
    switch (chartType) {
      case "line":
        return (
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              stroke="#999"
              tick={{ fontSize: 12, fill: "#999" }}
              tickLine={{ stroke: "#666" }}
            />
            <YAxis
              stroke="#999"
              tick={{ fontSize: 12, fill: "#999" }}
              tickLine={{ stroke: "#666" }}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#00A3FF"
              strokeWidth={2}
              dot={false}
              name="Price (USD)"
              activeDot={{ r: 6, fill: "#00A3FF" }}
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00A3FF" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#00A3FF" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              stroke="#999"
              tick={{ fontSize: 12, fill: "#999" }}
              tickLine={{ stroke: "#666" }}
            />
            <YAxis
              stroke="#999"
              tick={{ fontSize: 12, fill: "#999" }}
              tickLine={{ stroke: "#666" }}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#00A3FF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
              name="Price (USD)"
            />
          </AreaChart>
        );

      case "candle":
        return (
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              stroke="#999"
              tick={{ fontSize: 12, fill: "#999" }}
              tickLine={{ stroke: "#666" }}
            />
            <YAxis
              stroke="#999"
              tick={{ fontSize: 12, fill: "#999" }}
              tickLine={{ stroke: "#666" }}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Bar
              dataKey="price"
              fill="#00A3FF"
              name="Price (USD)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="volume"
              fill="#8B5CF6"
              name="Volume (M)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-linear-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 p-4 rounded-xl">
          <p className="text-gray-400 text-sm mb-1">Current Price</p>
          <p className="text-2xl font-bold text-blue-400">
            ${currentToken?.price_by_ada?.toFixed(12) || "N/A"}
          </p>
        </div>
        <div
          className={`bg-linear-to-br p-4 rounded-xl border ${
            (currentToken?.price_change_percentage_24h || 0) >= 0
              ? "from-green-500/10 to-green-600/10 border-green-500/20"
              : "from-red-500/10 to-red-600/10 border-red-500/20"
          }`}
        >
          <p className="text-gray-400 text-sm mb-1">24h Change</p>
          <p
            className={`text-2xl font-bold ${
              (currentToken?.price_change_percentage_24h || 0) >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {currentToken?.price_change_percentage_24h?.toFixed(2) || "0.00"}%
          </p>
        </div>
        <div className="bg-linear-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 p-4 rounded-xl">
          <p className="text-gray-400 text-sm mb-1">24h High</p>
          <p className="text-2xl font-bold text-purple-400">
            ${currentToken?.high_24h?.toFixed(12) || "N/A"}
          </p>
        </div>
        <div className="bg-linear-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 p-4 rounded-xl">
          <p className="text-gray-400 text-sm mb-1">24h Low</p>
          <p className="text-2xl font-bold text-orange-400">
            ${currentToken?.low_24h?.toFixed(12) || "N/A"}
          </p>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="bg-linear-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-white/10">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div>
            <h4 className="text-xl font-bold text-white mb-1">
              Price Chart ({timeInterval} days)
            </h4>
            <p
              className={`text-sm font-semibold ${
                isPositive ? "text-green-400" : "text-red-400"
              }`}
            >
              {isPositive ? "↗" : "↘"} {priceChangePercent}% ({timeInterval}d)
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Time Intervals */}
            <div className="flex gap-1 bg-slate-700/50 rounded-lg p-1">
              {([7, 30, 90, 365] as TimeInterval[]).map((interval) => (
                <button
                  key={interval}
                  onClick={() => setTimeInterval(interval)}
                  className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
                    timeInterval === interval
                      ? "bg-blue-500 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {interval === 365 ? "1Y" : `${interval}D`}
                </button>
              ))}
            </div>

            {/* Chart Types */}
            <div className="flex gap-1 bg-slate-700/50 rounded-lg p-1">
              <button
                onClick={() => setChartType("line")}
                className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
                  chartType === "line"
                    ? "bg-blue-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Line Chart"
              >
                📈 Line
              </button>
              <button
                onClick={() => setChartType("area")}
                className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
                  chartType === "area"
                    ? "bg-blue-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Area Chart"
              >
                📊 Area
              </button>
              <button
                onClick={() => setChartType("candle")}
                className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
                  chartType === "candle"
                    ? "bg-blue-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Bar Chart with Volume"
              >
                📉 Bars
              </button>
            </div>
          </div>
        </div>

        {/* Chart Display */}
        <div style={{ width: "100%", height: "500px" }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Additional Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10">
          <div>
            <p className="text-gray-400 text-xs mb-1">Market Cap</p>
            <p className="text-white font-semibold">
              $
              {currentToken?.market_cap
                ? (currentToken.market_cap / 1000000).toFixed(2)
                : "N/A"}
              M
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">24h Volume</p>
            <p className="text-white font-semibold">
              $
              {currentToken?.volume_24h
                ? (currentToken.volume_24h / 1000000).toFixed(2)
                : "N/A"}
              M
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">All-Time High</p>
            <p className="text-white font-semibold">
              ${currentToken?.ath?.toFixed(12) || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">All-Time Low</p>
            <p className="text-white font-semibold">
              ${currentToken?.atl?.toFixed(6) || "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceChart;
