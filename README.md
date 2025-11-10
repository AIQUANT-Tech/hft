┌─────────────────────────────────────────────────────────────┐
│ React + TypeScript Dashboard │
│ (Vite Frontend) │
│ - Live positions & PnL │
│ - Strategy controls (start/stop/configure) │
│ - Multi-DEX order book visualization │
│ - Performance analytics & charts │
│ - Risk metrics dashboard │
└────────────────────────┬────────────────────────────────────┘
│ WebSocket + REST API
│
┌────────────────────────▼────────────────────────────────────┐
│ Express + TypeScript Backend API │
│ (Port 8080) │
│ - REST API endpoints │
│ - WebSocket server (real-time updates) │
│ - Strategy configuration management │
│ - Database layer (PostgreSQL/MongoDB) │
│ - Authentication & authorization │
└────────────────────────┬────────────────────────────────────┘
│ Message Queue (Redis/RabbitMQ)
│
┌────────────────────────▼────────────────────────────────────┐
│ Trading Engine (TypeScript/Node.js) │
│ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Strategy Manager (Hummingbot-inspired) │ │
│ │ - Pure Market Making │ │
│ │ - Cross-DEX Arbitrage │ │
│ │ - Trend Following │ │
│ │ - Volume-Based Adaptive │ │
│ │ - Statistical Arbitrage │ │
│ └──────────────────────────────────────────────────────┘ │
│ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ DEX Aggregator Layer │ │
│ │ - Minswap Connector │ │
│ │ - SundaeSwap Connector │ │
│ │ │ - MuesliSwap Connector │ │
│ │ - WingRiders Connector │ │
│ │ - Unified DEX Interface │ │
│ └──────────────────────────────────────────────────────┘ │
│ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Order Management System │ │
│ │ - Order lifecycle tracking │ │
│ │ - Position management │ │
│ │ - Risk management │ │
│ │ - Smart order routing │ │
│ └──────────────────────────────────────────────────────┘ │
│ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Execution Engine (Lucid-based) │ │
│ │ - Transaction building │ │
│ │ - Transaction signing │ │
│ │ - Multi-DEX execution │ │
│ │ - Slippage protection │ │
│ └──────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
│
│ Blockfrost API / Koios / Direct Node
│
┌─────────▼─────────┐
│ Cardano Blockchain │
│ - Minswap DEX │
│ - SundaeSwap DEX │
│ - MuesliSwap DEX │
│ - WingRiders DEX │
└─────────────────────┘
