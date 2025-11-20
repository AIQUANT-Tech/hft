// src/services/logger.service.ts

import { Server as SocketIOServer } from "socket.io";

export interface LogMessage {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error";
  message: string;
  strategyName?: string;
  category?: "strategy" | "order" | "wallet" | "system";
}

class LoggerService {
  private io: SocketIOServer | null = null;
  private logHistory: LogMessage[] = [];
  private readonly MAX_HISTORY = 100;
  private logCounter = 0;

  setSocketIO(io: SocketIOServer) {
    this.io = io;
    console.log("✅ Logger service initialized with WebSocket");
  }

  private generateLogId(): string {
    this.logCounter++;
    return `log-${Date.now()}-${this.logCounter}`;
  }

  log(
    type: LogMessage["type"],
    message: string,
    strategyName?: string,
    category: LogMessage["category"] = "system"
  ) {
    const logMessage: LogMessage = {
      id: this.generateLogId(),
      timestamp: new Date(),
      type,
      message,
      strategyName,
      category,
    };

    // Add to history
    this.logHistory.unshift(logMessage);
    if (this.logHistory.length > this.MAX_HISTORY) {
      this.logHistory = this.logHistory.slice(0, this.MAX_HISTORY);
    }

    // Emit to connected clients
    if (this.io) {
      this.io.emit("log:message", logMessage);
    }

    // Also log to console with emoji
    const emoji = this.getEmoji(type);
    console.log(`${emoji} ${message}`);
  }

  info(
    message: string,
    strategyName?: string,
    category?: LogMessage["category"]
  ) {
    this.log("info", message, strategyName, category);
  }

  success(
    message: string,
    strategyName?: string,
    category?: LogMessage["category"]
  ) {
    this.log("success", message, strategyName, category);
  }

  warning(
    message: string,
    strategyName?: string,
    category?: LogMessage["category"]
  ) {
    this.log("warning", message, strategyName, category);
  }

  error(
    message: string,
    strategyName?: string,
    category?: LogMessage["category"]
  ) {
    this.log("error", message, strategyName, category);
  }

  getHistory(): LogMessage[] {
    return this.logHistory;
  }

  private getEmoji(type: LogMessage["type"]): string {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  }
}

export const logger = new LoggerService();
