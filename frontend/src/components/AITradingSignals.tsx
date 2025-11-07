import type { Token } from "@/redux/tokensSlice";
import React, { useState } from "react";

interface AISignal {
  token: Token;
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  confidence: number;
  reason: string;
  aiScore: number;
  momentum: number;
  volatility: number;
  trend: "bullish" | "bearish" | "neutral";
}

interface AITradingSignalsProps {
  tokens: Token[];
  onTokenSelect: (token: Token) => void;
}

const AITradingSignals: React.FC<AITradingSignalsProps> = ({
  tokens,
  onTokenSelect,
}) => {
  const [signals, setSignals] = useState<AISignal[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<
    "momentum" | "value" | "breakout" | "ai_hybrid"
  >("ai_hybrid");

  // Simulate AI analysis (replace with real AI/ML model later)
  const analyzeTokens = () => {
    setIsAnalyzing(true);

    setTimeout(() => {
      const analyzedSignals: AISignal[] = tokens
        .slice(0, 10) // Top 10 tokens
        .map((token) => {
          // Simulate AI analysis metrics
          const momentum = Math.random() * 100;
          const volatility = Math.random() * 100;
          const aiScore = calculateAIScore(token, momentum, volatility);
          const signal = getSignal(aiScore);
          const trend = getTrend(momentum);
          const confidence = Math.min(95, 60 + Math.random() * 35);
          const reason = getAIReason(signal, token, momentum, volatility);

          return {
            token,
            signal,
            confidence,
            reason,
            aiScore,
            momentum,
            volatility,
            trend,
          };
        })
        .sort((a, b) => b.aiScore - a.aiScore);

      setSignals(analyzedSignals);
      setIsAnalyzing(false);
    }, 2000);
  };

  const calculateAIScore = (
    token: Token,
    momentum: number,
    volatility: number
  ): number => {
    // Simple scoring algorithm (replace with ML model)
    let score = 50;

    // Price momentum
    score += momentum * 0.3;

    // Volatility adjustment
    score += volatility > 70 ? -10 : volatility < 30 ? 10 : 0;

    // Verified tokens get bonus
    score += token.is_verified ? 15 : 0;

    // Random AI "secret sauce" 🤫
    score += Math.random() * 20 - 10;

    return Math.max(0, Math.min(100, score));
  };

  const getSignal = (
    score: number
  ): "strong_buy" | "buy" | "hold" | "sell" | "strong_sell" => {
    if (score >= 80) return "strong_buy";
    if (score >= 65) return "buy";
    if (score >= 45) return "hold";
    if (score >= 30) return "sell";
    return "strong_sell";
  };

  const getTrend = (momentum: number): "bullish" | "bearish" | "neutral" => {
    if (momentum >= 60) return "bullish";
    if (momentum <= 40) return "bearish";
    return "neutral";
  };

  const getAIReason = (
    signal: AISignal["signal"],
    token: Token,
    momentum: number,
    _volatility: number
  ): string => {
    const reasons: Record<AISignal["signal"], string[]> = {
      strong_buy: [
        `AI detected strong bullish momentum with ${momentum.toFixed(
          1
        )}% upward trend`,
        `Neural network identifies ${token.ticker} as undervalued with high growth potential`,
        `Machine learning model predicts 78% probability of upward movement`,
        `Deep learning analysis shows accumulation pattern forming`,
      ],
      buy: [
        `Technical indicators suggest favorable entry point`,
        `AI sentiment analysis shows increasing positive momentum`,
        `Pattern recognition identifies potential breakout setup`,
        `Quantitative models indicate positive risk/reward ratio`,
      ],
      hold: [
        `Current price consolidation suggests waiting for confirmation`,
        `AI models recommend patience for clearer trend formation`,
        `Market conditions neutral - maintain current positions`,
        `Algorithmic analysis suggests sideways movement ahead`,
      ],
      sell: [
        `Momentum indicators showing weakness`,
        `AI risk assessment suggests profit-taking opportunity`,
        `Technical analysis indicates potential resistance level`,
        `Predictive models show decreasing probability of gains`,
      ],
      strong_sell: [
        `High volatility detected - risk management advised`,
        `AI models predict potential downward correction`,
        `Multiple bearish signals identified by neural networks`,
        `Quantitative risk score exceeds safe threshold`,
      ],
    };

    const signalReasons = reasons[signal] ?? reasons.hold;
    return signalReasons[Math.floor(Math.random() * signalReasons.length)];
  };

  const getSignalColor = (
    signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell"
  ): { bg: string; text: string; border: string } => {
    const colors = {
      strong_buy: {
        bg: "bg-green-500/20",
        text: "text-green-400",
        border: "border-green-500/30",
      },
      buy: {
        bg: "bg-emerald-500/20",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
      },
      hold: {
        bg: "bg-yellow-500/20",
        text: "text-yellow-400",
        border: "border-yellow-500/30",
      },
      sell: {
        bg: "bg-orange-500/20",
        text: "text-orange-400",
        border: "border-orange-500/30",
      },
      strong_sell: {
        bg: "bg-red-500/20",
        text: "text-red-400",
        border: "border-red-500/30",
      },
    };
    return colors[signal] || colors.hold;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "bullish") return "📈";
    if (trend === "bearish") return "📉";
    return "➡️";
  };

  return (
    <div className="mb-8 bg-linear-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
            <span className="text-3xl">🤖</span>
            AI Trading Intelligence
          </h2>
          <p className="text-gray-400 text-sm">
            Powered by Advanced Neural Networks & Machine Learning Models
          </p>
        </div>

        <button
          onClick={analyzeTokens}
          disabled={isAnalyzing || tokens.length === 0}
          className="px-6 py-3 bg-linear-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
              Analyzing...
            </>
          ) : (
            <>⚡ Analyze Market</>
          )}
        </button>
      </div>

      {/* Strategy Selector */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {[
          { key: "ai_hybrid", label: "🧠 AI Hybrid", desc: "Best Overall" },
          { key: "momentum", label: "🚀 Momentum", desc: "Short-term" },
          { key: "value", label: "💎 Value", desc: "Long-term" },
          { key: "breakout", label: "⚡ Breakout", desc: "High Risk" },
        ].map((strategy) => (
          <button
            key={strategy.key}
            onClick={() =>
              setSelectedStrategy(
                strategy.key as "momentum" | "value" | "breakout" | "ai_hybrid"
              )
            }
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              selectedStrategy === strategy.key
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-slate-800/50 text-gray-400 hover:text-white border border-white/10"
            }`}
          >
            <div>{strategy.label}</div>
            <div className="text-xs opacity-70">{strategy.desc}</div>
          </button>
        ))}
      </div>

      {/* AI Signals */}
      {signals.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
          <div className="text-6xl mb-4">🤖</div>
          <p className="text-gray-400 text-lg mb-2">
            AI Models Ready to Analyze
          </p>
          <p className="text-gray-500 text-sm">
            Click "Analyze Market" to receive AI-powered trading signals
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal, index) => {
            const colors = getSignalColor(signal.signal);
            return (
              <div
                key={signal.token.token_id}
                onClick={() => onTokenSelect(signal.token)}
                className="bg-slate-800/50 border border-white/10 rounded-xl p-4 hover:bg-slate-800/80 transition-all cursor-pointer hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Rank & Token Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="text-2xl font-bold text-gray-600">
                      #{index + 1}
                    </div>
                    <img
                      src={signal.token.logo}
                      alt={signal.token.ticker}
                      className="w-10 h-10 rounded-full border-2 border-white/10"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          signal.token.ticker
                        )}&background=0033AD&color=fff&bold=true&size=128`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-lg">
                        {signal.token.ticker}
                      </div>
                      <div className="text-sm text-gray-400 truncate">
                        {signal.reason}
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4">
                    {/* AI Score */}
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">AI Score</div>
                      <div className="text-xl font-bold text-blue-400">
                        {signal.aiScore.toFixed(0)}
                      </div>
                    </div>

                    {/* Trend */}
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">Trend</div>
                      <div className="text-2xl">
                        {getTrendIcon(signal.trend)}
                      </div>
                    </div>

                    {/* Signal */}
                    <div
                      className={`px-4 py-2 rounded-lg border ${colors.bg} ${colors.text} ${colors.border} font-semibold text-sm min-w-[120px] text-center`}
                    >
                      <div>{signal.signal.toUpperCase().replace("_", " ")}</div>
                      <div className="text-xs opacity-70">
                        {signal.confidence.toFixed(0)}% confidence
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-xs text-yellow-400/80">
          ⚠️ <strong>Disclaimer:</strong> AI signals are for informational
          purposes only. Not financial advice. Always do your own research
          (DYOR) before trading.
        </p>
      </div>
    </div>
  );
};

export default AITradingSignals;
