import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import PortfolioStats from "@/components/dashboard/PortfolioStats.tsx";
import PortfolioChart from "@/components/dashboard/PortfolioChart.tsx";
import StrategyBreakdown from "@/components/dashboard/StrategyBreakdown.tsx";
import HoldingsTable from "@/components/dashboard/HoldingsTable.tsx";
import RecentActivity from "@/components/dashboard/RecentActivity.tsx";
import { toast } from "sonner";
import {
  fetchDashboardData,
  selectDashboardData,
  selectDashboardLoading,
  selectDashboardError,
} from "@/redux/dashboardSlice";
import type { AppDispatch } from "@/redux/store";
import StrategyMonitor from "@/components/StrategyMonitor";

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const portfolioData = useSelector(selectDashboardData);
  const loading = useSelector(selectDashboardLoading);
  const error = useSelector(selectDashboardError);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            No dashboard data available
          </p>
          <button
            onClick={() => dispatch(fetchDashboardData())}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Portfolio Overview Stats */}
        <PortfolioStats data={portfolioData.portfolio} />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Section - 60% */}
          <div className="lg:col-span-2 space-y-6">
            <PortfolioChart data={portfolioData.history} />
            <HoldingsTable data={portfolioData.holdings} />
          </div>

          {/* Right Section - 40% */}
          <div className="space-y-6">
            <StrategyBreakdown data={portfolioData.strategies} />
            <RecentActivity />
          </div>
        </div>

        {/* Active Strategies - Full Width */}
        <StrategyMonitor showLogs={false} />
      </div>
    </div>
  );
}
