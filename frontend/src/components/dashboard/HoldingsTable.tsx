import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";

type HoldingDto = {
  tokenSymbol: string;
  tokenName?: string;
  amount: string;
  valueAda: string;
  valueUsd?: string;
  priceChange24h: string;
};

interface HoldingsTableProps {
  data?: HoldingDto[];
}

export default function HoldingsTable({ data }: HoldingsTableProps) {
  const isDark = useSelector(selectIsDark);

  // If no data yet, show a simple skeleton/empty state
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
            <span>💰</span>
            Your Holdings
          </h2>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              isDark
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
            disabled
          >
            Export CSV
          </button>
        </div>
        <div className="h-24 flex items-center justify-center">
          <p className={isDark ? "text-slate-400" : "text-gray-600"}>
            No holdings data available
          </p>
        </div>
      </div>
    );
  }

  // Map API data into view model
  const holdings = data.map((h) => {
    const amountNum = Number(h.amount);
    const formatAmount = (n: number) => {
      if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " B";
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " M";
      if (n >= 1_000) return (n / 1_000).toFixed(1) + " K";
      return n.toString();
    };

    // check if asset is ADA then divide by 10^6
    if (h.tokenSymbol === "ADA") {
      return {
        token: h.tokenName,
        amountDisplay: formatAmount(amountNum / 1_000_000),
      };
    }

    // Format large numbers (2.5B, 1.2M, etc.)

    return {
      token: h.tokenName,
      amountDisplay: formatAmount(amountNum),
    };
  });

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
          <span>💰</span>
          Your Holdings
        </h2>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            isDark
              ? "bg-slate-700 hover:bg-slate-600 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          Export CSV
        </button>
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
                Token
              </th>
              <th
                className={`text-right py-3 px-4 text-sm font-semibold ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding, index) => (
              <tr
                key={index}
                className={`border-b transition-colors ${
                  isDark
                    ? "border-slate-700 hover:bg-slate-700/50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {holding.token}
                    </span>
                  </div>
                </td>
                <td
                  className={`text-right py-4 px-4 ${
                    isDark ? "text-slate-300" : "text-gray-700"
                  }`}
                >
                  {holding.amountDisplay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
