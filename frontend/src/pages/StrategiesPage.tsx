// src/pages/StrategiesPage.tsx

import StrategyMonitor from "../components/StrategyMonitor";
import CreateStrategyForm from "../components/CreateStrategyForm";

export default function StrategiesPage() {
  return (
    <div>
      <div className="mb-6 p-6 bg-linear-to-r from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-gray-300 dark:border-white/10">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {" "}
          🎯 Trading Strategies
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
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
