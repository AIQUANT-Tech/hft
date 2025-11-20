// src/pages/OrdersPage.tsx

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";

const API_URL = "http://localhost:8080";

interface Order {
  id: string;
  walletAddress: string;
  tradingPair: string;
  baseToken: string;
  quoteToken: string;
  isBuy: boolean;
  amount: number | string;
  targetPrice: number | string;
  currentPrice: number | string;
  triggerAbove: boolean;
  status: "pending" | "executing" | "completed" | "failed";
  txHash?: string;
  executedPrice?: number | string;
  executedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export default function OrdersPage() {
  const isDark = useSelector(selectIsDark);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "executing" | "completed" | "failed"
  >("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchOrders();

    if (autoRefresh) {
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatPrice = (price: number | string | undefined): string => {
    if (price === undefined || price === null) return "0.000000";
    const num = typeof price === "string" ? parseFloat(price) : price;
    // ✅ Show up to 12 decimals, remove trailing zeros
    return num.toFixed(12).replace(/\.?0+$/, '');
  };

  const formatAmount = (amount: number | string | undefined): string => {
    if (amount === undefined || amount === null) return "0";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toString();
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/orders`);
      if (response.data.success) {
        setOrders(response.data.orders || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      await axios.delete(`${API_URL}/api/orders/${orderToDelete}`);
      toast.success("Order deleted successfully");
      setShowDeleteModal(false);
      setOrderToDelete(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete order");
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    return order.status === filter;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    executing: orders.filter((o) => o.status === "executing").length,
    completed: orders.filter((o) => o.status === "completed").length,
    failed: orders.filter((o) => o.status === "failed").length,
  };

  const getStatusBadge = (status: Order["status"]) => {
    const styles = {
      pending:
        "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30",
      executing:
        "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30",
      completed:
        "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
      failed:
        "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30",
    };

    const icons = {
      pending: "⏳",
      executing: "⚡",
      completed: "✅",
      failed: "❌",
    };

    return (
      <span
        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${styles[status]}`}
      >
        {icons[status]} {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Trade Orders
        </h1>
        <div
          className={`rounded-2xl p-8 shadow-lg border ${isDark
            ? "bg-gray-800 border-white/10"
            : "bg-white border-gray-200"
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              Loading orders...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Trade Orders
          </h1>
          <p
            className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"
              }`}
          >
            Manage and track your trading orders
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2.5 rounded-xl font-semibold transition-all shadow-md flex items-center gap-2 ${autoRefresh
              ? "bg-linear-to-r from-green-500 to-emerald-500 text-white"
              : isDark
                ? "bg-gray-800 text-gray-300 border border-white/10"
                : "bg-white text-gray-700 border border-gray-200"
              }`}
          >
            <span>{autoRefresh ? "🔄" : "⏸️"}</span>
            <span className="hidden sm:inline">Auto-refresh</span>
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchOrders}
            className={`px-4 py-2.5 font-semibold rounded-xl transition-all shadow-md border ${isDark
              ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border-white/10"
              : "bg-white hover:bg-gray-100 text-gray-700 border-gray-200"
              }`}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        className={`rounded-2xl p-4 shadow-lg border ${isDark
          ? "bg-gray-800 border-white/10"
          : "bg-white border-gray-200"
          }`}
      >
        <div className="flex gap-2 overflow-x-auto">
          {(
            ["all", "pending", "executing", "completed", "failed"] as const
          ).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2.5 rounded-xl font-semibold whitespace-nowrap transition-all ${filter === status
                ? "bg-linear-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                : isDark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {status === "all"
                ? "All Orders"
                : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {statusCounts[status]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div
          className={`rounded-2xl p-12 shadow-lg border text-center ${isDark
            ? "bg-gray-800 border-white/10"
            : "bg-white border-gray-200"
            }`}
        >
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 ${isDark ? "bg-slate-700" : "bg-gray-100"
              }`}
          >
            <span className="text-5xl">📋</span>
          </div>
          <h3
            className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"
              }`}
          >
            No {filter !== "all" ? filter : ""} orders found
          </h3>
          <p className={isDark ? "text-gray-400" : "text-gray-600"}>
            {filter === "all"
              ? "Create a strategy to start trading"
              : `No orders with status "${filter}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`rounded-2xl shadow-lg p-6 border hover:shadow-xl transition-all ${isDark
                ? "bg-linear-to-br from-gray-800 to-gray-900 border-white/10"
                : "bg-linear-to-br from-white to-gray-50 border-gray-200"
                }`}
            >
              {/* Order Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
                    <span className="text-2xl">
                      {order.isBuy ? "📈" : "📉"}
                    </span>
                  </div>
                  <div>
                    <h3
                      className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"
                        }`}
                    >
                      {order.isBuy ? "BUY" : "SELL"} {order.tradingPair}
                    </h3>
                    <p
                      className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                    >
                      Order ID: {order.id.substring(0, 8)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(order.status)}

                  {(order.status === "pending" ||
                    order.status === "failed") && (
                      <button
                        onClick={() => {
                          setOrderToDelete(order.id);
                          setShowDeleteModal(true);
                        }}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-md"
                      >
                        🗑️ Delete
                      </button>
                    )}
                </div>
              </div>

              {/* Order Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-4 border border-green-200 dark:border-green-500/30">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Amount
                  </p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatAmount(order.amount)}{" "}
                    {order.tradingPair.split("-")[0]}
                  </p>
                </div>

                <div className="bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-500/30">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Target Price
                  </p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ₳{formatPrice(order.targetPrice)}
                  </p>
                </div>

                <div className="bg-linear-to-br from-yellow-50 to-orange-50 dark:from-yellow-500/10 dark:to-orange-500/10 rounded-xl p-4 border border-yellow-200 dark:border-yellow-500/30">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Current Price
                  </p>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    ₳{formatPrice(order.currentPrice)}
                  </p>
                </div>

                <div className="bg-linear-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl p-4 border border-purple-200 dark:border-purple-500/30">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Created
                  </p>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Execution Details */}
              {order.status === "completed" && order.txHash && (
                <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-4 border border-green-200 dark:border-green-500/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Executed Price
                      </p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        ₳{formatPrice(order.executedPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Transaction Hash
                      </p>
                      <a
                        href={`https://preprod.cardanoscan.io/transaction/${order.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                      >
                        {order.txHash.substring(0, 16)}...
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {order.status === "failed" && order.errorMessage && (
                <div className="bg-linear-to-r from-red-50 to-pink-50 dark:from-red-500/10 dark:to-pink-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/30">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Error Message
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {order.errorMessage}
                  </p>
                </div>
              )}

              {/* Wallet Info */}
              <div
                className={`mt-4 pt-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"
                  }`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                >
                  Wallet:{" "}
                  <span className="font-mono">
                    {order.walletAddress.substring(0, 20)}...
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && orderToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl p-8 max-w-md w-full border shadow-2xl ${isDark
              ? "bg-slate-900 border-white/10"
              : "bg-white border-gray-300"
              }`}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3
                className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"
                  }`}
              >
                Delete Order?
              </h3>
              <p
                className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"
                  }`}
              >
                This action cannot be undone. The order will be permanently
                removed.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setOrderToDelete(null);
                }}
                className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all ${isDark
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={deleteOrder}
                className="flex-1 px-6 py-3 bg-linear-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold rounded-xl transition-all hover:scale-105 shadow-lg shadow-red-500/30"
              >
                Delete Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
