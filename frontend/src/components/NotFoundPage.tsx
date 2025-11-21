// src/pages/NotFoundPage.tsx

import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";

export default function NotFoundPage() {
    const navigate = useNavigate();
    const isDark = useSelector(selectIsDark);

    return (
        <div
            className={`min-h-screen flex items-center justify-center px-4 ${isDark ? "bg-gray-900" : "bg-gray-50"
                }`}
        >
            <div className="max-w-2xl w-full text-center">
                {/* 404 Illustration */}
                <div className="mb-8">
                    <div className="relative inline-block">
                        {/* Large 404 Text */}
                        <h1
                            className={`text-9xl font-bold ${isDark ? "text-gray-800" : "text-gray-200"
                                }`}
                        >
                            404
                        </h1>

                        {/* Floating Icons */}
                        <div className="absolute top-0 left-0 animate-bounce">
                            <span className="text-6xl">📊</span>
                        </div>
                        <div className="absolute top-0 right-0 animate-bounce delay-100">
                            <span className="text-6xl">💰</span>
                        </div>
                        <div className="absolute bottom-0 left-1/4 animate-bounce delay-200">
                            <span className="text-6xl">🎯</span>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                <div
                    className={`rounded-2xl p-8 shadow-lg border ${isDark
                        ? "bg-gray-800 border-white/10"
                        : "bg-white border-gray-200"
                        }`}
                >
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-linear-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <span className="text-4xl">🔍</span>
                        </div>

                        <h2
                            className={`text-3xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"
                                }`}
                        >
                            Page Not Found
                        </h2>

                        <p
                            className={`text-lg mb-2 ${isDark ? "text-gray-300" : "text-gray-600"
                                }`}
                        >
                            Oops! The trading strategy you're looking for doesn't exist.
                        </p>

                        <p
                            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"
                                }`}
                        >
                            The page might have been moved, deleted, or the URL might be incorrect.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate(-1)}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-md ${isDark
                                ? "bg-gray-700 hover:bg-gray-600 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                                }`}
                        >
                            ← Go Back
                        </button>

                        <button
                            onClick={() => navigate("/")}
                            className="px-6 py-3 bg-linear-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all shadow-lg hover:scale-105"
                        >
                            🏠 Home Page
                        </button>

                        <button
                            onClick={() => navigate("/strategies")}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-md ${isDark
                                ? "bg-purple-600 hover:bg-purple-700 text-white"
                                : "bg-purple-500 hover:bg-purple-600 text-white"
                                }`}
                        >
                            📊 View Strategies
                        </button>
                    </div>
                </div>

                {/* Helpful Links */}
                <div className="mt-8">
                    <p
                        className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                    >
                        Quick Links:
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={() => navigate("/tokens")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDark
                                ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-white/10"
                                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                                }`}
                        >
                            💎 Tokens
                        </button>

                        <button
                            onClick={() => navigate("/orders")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDark
                                ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-white/10"
                                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                                }`}
                        >
                            📋 Orders
                        </button>

                        <button
                            onClick={() => navigate("/wallets")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDark
                                ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-white/10"
                                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                                }`}
                        >
                            👛 Wallets
                        </button>
                    </div>
                </div>

                {/* Error Code */}
                <div className="mt-8">
                    <p
                        className={`text-xs font-mono ${isDark ? "text-gray-600" : "text-gray-400"
                            }`}
                    >
                        Error Code: HTTP 404 • Path: {window.location.pathname}
                    </p>
                </div>
            </div>
        </div>
    );
}
