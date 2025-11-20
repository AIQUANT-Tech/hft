// src/pages/StrategiesPage.tsx

import StrategyMonitor from "../components/StrategyMonitor";
import CreateStrategyForm from "../components/CreateStrategyForm";
import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";

export default function StrategiesPage() {
  const isDark = useSelector(selectIsDark);
  return (
    <div>
      <div className={`mb-6 p-6 bg-linear-to-r rounded-2xl border ${isDark ? "from-slate-900 to-slate-800 border-white/10" : " from-gray-100 to-gray-200 border-gray-300"}`}>
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          {" "}
          🎯 Trading Strategies
        </h2>
        <p className={`text-sm ${isDark ? "text-gray-200" : "text-gray-600"}`}>
          Create and monitor automated trading strategies
        </p>
      </div>

      <CreateStrategyForm />

      <div className="mt-8">
        <StrategyMonitor />
      </div>
    </div>
  );
}
