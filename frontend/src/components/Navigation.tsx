// src/components/Navigation.tsx
import { Link, useLocation } from "react-router-dom";
import WalletConnect from "./WalletConnect";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch, RootState } from "../redux/store";
import { toggleTheme, selectIsDark } from "../redux/themeSlice";

export default function Navigation() {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const isDark = useSelector(selectIsDark);
  const walletId = useSelector((state: RootState) => state.wallet.walletId);

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  // src/components/Navigation.tsx
  // Add Orders to navItems:

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: "🏠" },
    { path: "/tokens", label: "Tokens", icon: "💰" },
    { path: "/wallets", label: "Wallets", icon: "👛" },
    { path: "/strategies", label: "Strategies", icon: "🎯" },
    { path: "/orders", label: "Orders", icon: "📋" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={`sticky top-0 z-50 shadow-lg backdrop-blur-md border-b transition-colors ${
        isDark ? "border-gray-400/50" : "border-slate-400/50"
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          {/* Logo with gradient text */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Logo icon */}
              {/* <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDark
                    ? "bg-linear-to-br from-purple-500 to-pink-500"
                    : "bg-linear-to-br from-blue-500 to-cyan-500"
                } shadow-lg`}
              >
                <span className="text-xl">📈</span>
              </div> */}

              {/* Logo text */}
              <div className="flex flex-col">
                {/* <h1
                  className={`text-xl sm:text-2xl font-black ${
                    isDark
                      ? "bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                      : "bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"
                  }`}
                >
                  ADA VELOCITY
                </h1> */}
                <img
                  src="./logo.png"
                  alt="ADA VELOCITY"
                  className={`h-20 ${isDark ? "invert" : ""}`}
                />
                <p
                  className={`text-sm ml-22 ${
                    isDark ? "text-slate-200" : "text-gray-800"
                  }`}
                >
                  High-Frequency Trading
                </p>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          {walletId && (
            <div className="flex gap-2 sm:gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all text-sm sm:text-base flex items-center gap-2 ${
                    isActive(item.path)
                      ? isDark
                        ? "bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 scale-105"
                        : "bg-linear-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-105"
                      : isDark
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 hover:scale-105"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={handleToggleTheme}
              className={`p-2.5 sm:p-3 rounded-xl font-medium transition-all hover:scale-110 ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-yellow-400"
                  : "bg-gray-100 hover:bg-gray-200 text-orange-500"
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-pressed={isDark}
              aria-label="Toggle dark mode"
            >
              <span className="text-xl">{isDark ? "🌙" : "☀️"}</span>
            </button>

            {/* Wallet connect */}
            <WalletConnect />
          </div>
        </div>
      </div>
    </nav>
  );
}
