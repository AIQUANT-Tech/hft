// src/App.tsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { BrowserWallet } from "@meshsdk/core";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch, RootState } from "./redux/store";
import { ConnectWallet } from "./redux/walletSlice";
import { selectTheme } from "./redux/themeSlice";

import Navigation from "./components/Navigation";
import TokensPage from "./pages/TokensPage";
import WalletManagementPage from "./pages/WalletManagementPage";
import StrategiesPage from "./pages/StrategiesPage";
import { Toaster } from "sonner";
import OrdersPage from "./pages/OrdersPage";

export const WalletContext = React.createContext<BrowserWallet | null>(null);

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { walletId } = useSelector((state: RootState) => state.wallet);
  const theme = useSelector(selectTheme);
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);

  // ✅ Apply theme with smooth transition
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    reconnectWallet();
  }, [walletId]);

  const reconnectWallet = async () => {
    if (!walletId) {
      setWallet(null);
      return;
    }

    try {
      const availableWallets = await BrowserWallet.getAvailableWallets();
      const selectedWallet = availableWallets.find(
        (wallet) => wallet.id === walletId
      );

      if (!selectedWallet) {
        console.warn(`Wallet with ID ${walletId} not found.`);
        setWallet(null);
        return;
      }

      const connectedWallet = await BrowserWallet.enable(walletId);
      const address = (await connectedWallet.getChangeAddress()) || "N/A";
      const balances = await connectedWallet.getBalance();
      const lovelaceAsset = balances.find((asset) => asset.unit === "lovelace");
      const adaBalance =
        lovelaceAsset && lovelaceAsset.quantity
          ? Number(lovelaceAsset.quantity) / 1_000_000
          : 0;

      setWallet(connectedWallet);
      dispatch(
        ConnectWallet({
          walletId,
          address: address,
          BalanceAda: adaBalance.toString(),
        })
      );
      console.log("Wallet reconnected successfully");
    } catch (err: unknown) {
      console.error("Failed to reconnect wallet:", err);
      setWallet(null);
    }
  };

  return (
    <WalletContext.Provider value={wallet}>
      <Router>
        {/* ✅ Improved background with gradient and pattern */}
        <div className="min-h-screen transition-colors duration-300 relative overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          {/* ✅ Subtle animated background pattern */}
          <div className="absolute inset-0 opacity-30 dark:opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 dark:bg-purple-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 dark:bg-pink-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-purple-400 dark:bg-blue-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          {/* ✅ Content wrapper with backdrop blur */}
          <div className="relative z-10">
            {/* Navigation - Sticky and Full Width */}
            <Navigation />

            {/* Main Content with subtle container styling */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {/* ✅ Page transition wrapper */}
              <div className="animate-fadeIn">
                <Routes>
                  <Route path="/" element={<TokensPage />} />
                  <Route path="/wallets" element={<WalletManagementPage />} />
                  <Route path="/strategies" element={<StrategiesPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                </Routes>
              </div>
            </main>

            {/* ✅ Footer (optional, adds professional touch) */}
            <footer className="mt-12 py-6 text-center text-sm text-gray-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-800">
              <p>
                Cardano HFT Platform • Powered by{" "}
                <span className="font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Minswap
                </span>{" "}
                • Built on{" "}
                <span className="font-semibold text-blue-600 dark:text-purple-400">
                  Cardano
                </span>
              </p>
            </footer>
          </div>
        </div>

        {/* Toaster with theme support and custom styling */}
        <Toaster
          theme={theme}
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            className: "backdrop-blur-md",
            style: {
              background:
                theme === "dark"
                  ? "rgba(15, 23, 42, 0.9)"
                  : "rgba(255, 255, 255, 0.9)",
              border:
                theme === "dark"
                  ? "1px solid rgba(148, 163, 184, 0.2)"
                  : "1px solid rgba(229, 231, 235, 1)",
            },
          }}
        />
      </Router>
    </WalletContext.Provider>
  );
}

export default App;
