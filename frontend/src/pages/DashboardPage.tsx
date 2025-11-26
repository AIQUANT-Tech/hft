// src/pages/DashboardPage.tsx

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import PortfolioStats from "@/components/dashboard/PortfolioStats.tsx";
import PortfolioChart from "@/components/dashboard/PortfolioChart.tsx";
import StrategyBreakdown from "@/components/dashboard/StrategyBreakdown.tsx";
import HoldingsTable from "@/components/dashboard/HoldingsTable.tsx";
import RecentActivity from "@/components/dashboard/RecentActivity.tsx";
import ActiveStrategies from "@/components/dashboard/ActiveStrategies.tsx";
import axios from "axios";
import { toast } from "sonner";
import { selectAuth } from "@/redux/authSlice";

const API_URL = "http://localhost:8080";

export default function DashboardPage() {
  // const { walletId } = useSelector((state: RootState) => state.wallet);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useSelector(selectAuth);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard`, {
        withCredentials: true,
      });
      console.log("Dashboard data:", response.data);

      if (response.data.success) {
        setPortfolioData(response.data.data);
      } else {
        toast.error("Failed to load dashboard data");
      }
    } catch (error: any) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error(error.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

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
            onClick={fetchDashboardData}
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
            <RecentActivity data={portfolioData.activities} />
          </div>
        </div>

        {/* Active Strategies - Full Width */}
        <ActiveStrategies data={portfolioData.strategies} />
      </div>
    </div>
  );
}
