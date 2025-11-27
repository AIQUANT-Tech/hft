import { selectIsDark } from "@/redux/themeSlice";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { API_URL, type LogMessage } from "../StrategyMonitor";
import { io, type Socket } from "socket.io-client";

const RecentActivity: React.FC = () => {
  const [showActivityLog, setShowActivityLog] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [activityLogs, setActivityLogs] = useState<LogMessage[]>([]);
  const isDark = useSelector(selectIsDark);

  const getLogStyle = (type: LogMessage["type"]) => {
    switch (type) {
      case "success":
        return {
          icon: "✅",
          bg: "bg-green-50 dark:bg-green-500/10",
          border: "border-green-200 dark:border-green-500/30",
          text: "text-green-700 dark:text-green-400",
        };
      case "error":
        return {
          icon: "❌",
          bg: "bg-red-50 dark:bg-red-500/10",
          border: "border-red-200 dark:border-red-500/30",
          text: "text-red-700 dark:text-red-400",
        };
      case "warning":
        return {
          icon: "⚠️",
          bg: "bg-yellow-50 dark:bg-yellow-500/10",
          border: "border-yellow-200 dark:border-yellow-500/30",
          text: "text-yellow-700 dark:text-yellow-400",
        };
      default:
        return {
          icon: "ℹ️",
          bg: "bg-blue-50 dark:bg-blue-500/10",
          border: "border-blue-200 dark:border-blue-500/30",
          text: "text-blue-700 dark:text-blue-400",
        };
    }
  };

  const getCategoryBadge = (category?: string) => {
    const badges = {
      strategy: { emoji: "🎯", label: "Strategy" },
      order: { emoji: "📝", label: "Order" },
      wallet: { emoji: "👛", label: "Wallet" },
      system: { emoji: "⚙️", label: "System" },
    };
    return (
      badges[category as keyof typeof badges] || { emoji: "ℹ️", label: "Info" }
    );
  };

  const socketRef = useRef<Socket | null>(null);
  const MAX_LOGS = 100;
  useEffect(() => {
    // ✅ Prevent multiple connections
    if (socketRef.current?.connected) {
      console.log("⚠️ Socket already connected, skipping...");
      return;
    }

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to backend logs");
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from backend logs, reason:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error.message);
      setIsConnected(false);
    });

    socket.on("log:history", (history: LogMessage[]) => {
      console.log(`📜 Received ${history.length} log messages from history`);
      setActivityLogs(history);
    });

    socket.on("log:message", (log: LogMessage) => {
      setActivityLogs((prev) => [log, ...prev].slice(0, MAX_LOGS));
    });

    return () => {
      console.log("🧹 Cleaning up socket connection");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("log:history");
      socket.off("log:message");
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <div>
      {/* Activity Log */}
      {showActivityLog && (
        <div className="lg:col-span-1">
          <div
            className={`rounded-2xl shadow-lg border sticky top-6 overflow-hidden ${
              isDark
                ? "bg-gray-800 border-white/10"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="bg-linear-to-r from-blue-500 to-cyan-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h3 className="font-bold text-white">Recent Activity</h3>
                {isConnected ? (
                  <div
                    className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                    title="Connected"
                  ></div>
                ) : (
                  <div
                    className="w-2 h-2 bg-red-400 rounded-full"
                    title="Disconnected"
                  ></div>
                )}
              </div>
              <button
                onClick={() => setActivityLogs([])}
                className="text-xs text-white/80 hover:text-white underline"
              >
                Clear
              </button>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-2">
              {activityLogs.length === 0 ? (
                <div
                  className={`text-center py-8 ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  <p className="text-sm">No Activity yet</p>
                  <p className="text-xs mt-1">
                    {isConnected
                      ? "Waiting for backend events..."
                      : "Try executing a strategy..."}
                  </p>
                </div>
              ) : (
                activityLogs.map((log) => {
                  const style = getLogStyle(log.type);
                  const categoryBadge = getCategoryBadge(log.category);

                  return (
                    <div
                      key={log.id}
                      className={`${style.bg} ${style.border} border rounded-lg p-3 text-xs transition-all hover:scale-[1.02]`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {log.strategyName && (
                              <p className="font-bold text-gray-900 dark:text-white text-xs">
                                {log.strategyName}
                              </p>
                            )}
                            {log.category && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {categoryBadge.emoji} {categoryBadge.label}
                              </span>
                            )}
                          </div>
                          <p
                            className={`${style.text} leading-relaxed wrap-break-word`}
                          >
                            {log.message}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
