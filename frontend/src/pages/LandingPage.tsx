// src/pages/LandingPage.tsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { selectIsDark } from "@/redux/themeSlice";

export default function LandingPage() {
  const navigate = useNavigate();
  const isDark = useSelector(selectIsDark);
  const { walletId } = useSelector((state: RootState) => state.wallet);

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (walletId) {
      navigate("/dashboard");
    }
  }, [walletId, navigate]);

  const features = [
    {
      icon: "📊",
      title: "Grid Trading",
      description:
        "Profit from market volatility with automated grid strategies",
    },
    {
      icon: "💰",
      title: "DCA Strategy",
      description: "Dollar-cost averaging for consistent accumulation",
    },
    {
      icon: "🎯",
      title: "Price Targets",
      description: "Set precise entry and exit points for your trades",
    },
    {
      icon: "🛡️",
      title: "Stop Loss / Take Profit",
      description: "Protect your capital and lock in profits automatically",
    },
  ];

  const stats = [
    { value: "24/7", label: "Automated Trading" },
    { value: "99.7%", label: "Success Rate" },
    { value: "100%", label: "Non-Custodial" },
    { value: "∞", label: "Strategies" },
  ];

  return (
    <div>
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Main Hero Content */}
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 mb-8">
              <span className="text-2xl">🚀</span>
              <span
                className={`text-sm font-semibold ${
                  isDark ? "text-blue-400" : "text-blue-600"
                }`}
              >
                Powered by Cardano Blockchain
              </span>
            </div>

            {/* Main Heading */}
            <h1
              className={`text-5xl md:text-7xl font-black mb-6 leading-tight ${
                isDark
                  ? "bg-linear-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
                  : "bg-linear-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent"
              }`}
            >
              Automated Crypto Trading
              <br />
              Made Simple
            </h1>

            {/* Subtitle */}
            <p
              className={`text-xl md:text-2xl mb-12 max-w-3xl mx-auto ${
                isDark ? "text-slate-300" : "text-gray-600"
              }`}
            >
              Trade smarter with{" "}
              <span
                className={`font-semibold text-2xl bg-linear-to-r bg-clip-text text-transparent ${
                  isDark
                    ? "from-purple-400 to-pink-400"
                    : "from-blue-600 to-cyan-600"
                }`}
              >
                ADA VELOCITY
              </span>{" "}
              on Cardano. Set your strategy, connect your wallet, and let
              automation do the work.
            </p>

            {/* Quick Stats */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-2xl backdrop-blur-xl border ${
                    isDark
                      ? "bg-slate-800/30 border-white/5"
                      : "bg-white/50 border-gray-200"
                  }`}
                >
                  <div
                    className={`text-3xl font-black mb-2 ${
                      isDark
                        ? "bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                        : "bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"
                    }`}
                  >
                    {stat.value}
                  </div>
                  <div
                    className={`text-sm ${
                      isDark ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className={`text-4xl md:text-5xl font-black mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Powerful Trading Strategies
            </h2>
            <p
              className={`text-lg ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Choose from multiple proven strategies or create your own
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-6 rounded-2xl backdrop-blur-xl border transition-all hover:scale-105 hover:shadow-2xl ${
                  isDark
                    ? "bg-slate-800/50 border-white/10 hover:bg-slate-800/70"
                    : "bg-white/80 border-gray-200 hover:bg-white"
                }`}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3
                  className={`text-xl font-bold mb-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {feature.title}
                </h3>
                <p
                  className={`text-sm ${
                    isDark ? "text-slate-400" : "text-gray-600"
                  }`}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className={`text-4xl md:text-5xl font-black mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              How It Works
            </h2>
            <p
              className={`text-lg ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Get started in three simple steps
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Connect Wallet",
                description:
                  "Link your Cardano wallet (Nami, Eternl, or Lace) securely",
                icon: "🔗",
              },
              {
                step: "2",
                title: "Choose Strategy",
                description:
                  "Select from Grid, DCA, Price Target, or Stop-Loss strategies",
                icon: "⚙️",
              },
              {
                step: "3",
                title: "Start Trading",
                description:
                  "Sit back and watch your bot trade automatically 24/7",
                icon: "🚀",
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-6 p-6 rounded-2xl backdrop-blur-xl border ${
                  isDark
                    ? "bg-slate-800/50 border-white/10"
                    : "bg-white/80 border-gray-200"
                }`}
              >
                <div className="shrink-0">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black ${
                      isDark
                        ? "bg-linear-to-br from-purple-500 to-pink-500"
                        : "bg-linear-to-br from-blue-500 to-cyan-500"
                    } text-white shadow-lg`}
                  >
                    {item.step}
                  </div>
                </div>
                <div className="flex-1">
                  <h3
                    className={`text-xl font-bold mb-1 flex items-center gap-2 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.title}
                  </h3>
                  <p
                    className={`${isDark ? "text-slate-400" : "text-gray-600"}`}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div
          className={`max-w-4xl mx-auto text-center p-12 rounded-3xl backdrop-blur-xl border ${
            isDark
              ? "bg-linear-to-r from-purple-900/50 to-pink-900/50 border-white/10"
              : "bg-linear-to-r from-blue-50 to-cyan-50 border-gray-200"
          }`}
        >
          <h2
            className={`text-4xl md:text-5xl font-black mb-6 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Ready to Start Trading?
          </h2>
          <p
            className={`text-lg mb-8 ${
              isDark ? "text-slate-300" : "text-gray-600"
            }`}
          >
            Connect your wallet and start automating your trades today
          </p>
        </div>
      </div>
    </div>
  );
}
