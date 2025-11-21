// src/pages/ProfilePage.tsx

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { selectIsDark } from "@/redux/themeSlice";
import { logoutUser, selectAuth } from "@/redux/authSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import { disconnectWallet } from "@/redux/walletSlice";

const API_URL = "http://localhost:8080";

interface Profile {
    id: number;
    walletAddress: string;
    displayName?: string;
    email?: string;
    avatarUrl?: string;
    bio?: string;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
}

export default function ProfilePage() {
    const isDark = useSelector(selectIsDark);
    const { isAuthenticated } = useSelector(selectAuth);
    const { walletId } = useSelector((state: RootState) => state.wallet);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [formData, setFormData] = useState({
        displayName: "",
        email: "",
        bio: "",
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const dispatch = useDispatch<AppDispatch>();
    useEffect(() => {
        if (!walletId) {
            window.location.href = "/";
        }
    }, [walletId]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchProfile();
        }
    }, [isAuthenticated]);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/profile`, {
                withCredentials: true,
            });

            if (response.data.success) {
                const profileData = response.data.profile;
                setProfile(profileData);
                setFormData({
                    displayName: profileData.displayName || "",
                    email: profileData.email || "",
                    bio: profileData.bio || "",
                });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await axios.put(
                `${API_URL}/api/profile`,
                formData,
                { withCredentials: true }
            );

            if (response.data.success) {
                setProfile(response.data.profile);
                toast.success("Profile updated successfully!");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const disconnect = async () => {
        try {
            // ✅ 1. Logout from backend (clears cookie)
            await dispatch(logoutUser()).unwrap();

            // ✅ 2. Clear wallet state
            dispatch(disconnectWallet());

            toast.info("Wallet disconnected", {
                closeButton: true,
            });
        } catch (error) {
            console.error("Disconnect error:", error);
            // Still disconnect locally even if backend fails
            dispatch(disconnectWallet());
            toast.info("Wallet disconnected", {
                closeButton: true,
            });
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await axios.delete(`${API_URL}/api/profile`, {
                withCredentials: true,
            });
            await disconnect();
            toast.success("Account deleted successfully");
            setShowDeleteModal(false);
            // Redirect to home
            window.location.href = "/";
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to delete account");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                    Profile not found
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    {/* Display the Avatar */}
                    <img src={profile.avatarUrl} alt="Avatar URL" className="w-16 h-16 rounded-full" />
                </div>
                <div>
                    <h1
                        className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"
                            }`}
                    >
                        Profile Settings
                    </h1>
                    <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                        Manage your account information
                    </p>
                </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Wallet Address (Read-only) */}
                <div
                    className={`rounded-2xl p-6 shadow-lg border ${isDark
                        ? "bg-gray-800 border-white/10"
                        : "bg-white border-gray-200"
                        }`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">👛</span>
                        <h2
                            className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"
                                }`}
                        >
                            Wallet Address
                        </h2>
                    </div>

                    <div className="bg-linear-to-r from-yellow-50 to-orange-50 dark:from-yellow-500/10 dark:to-orange-500/10 rounded-xl p-4 border border-yellow-200 dark:border-yellow-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🔒</span>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400 font-semibold">
                                Read-only (Cannot be changed)
                            </p>
                        </div>
                        <p className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                            {profile.walletAddress}
                        </p>
                    </div>
                </div>

                {/* Editable Profile Fields */}
                <div
                    className={`rounded-2xl p-6 shadow-lg border ${isDark
                        ? "bg-gray-800 border-white/10"
                        : "bg-white border-gray-200"
                        }`}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-2xl">✏️</span>
                        <h2
                            className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"
                                }`}
                        >
                            Profile Information
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {/* Display Name */}
                        <div>
                            <label
                                className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
                                    }`}
                            >
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) =>
                                    setFormData({ ...formData, displayName: e.target.value })
                                }
                                placeholder="John Doe"
                                maxLength={100}
                                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${isDark
                                    ? "bg-slate-700 border-white/10 text-white focus:border-blue-500"
                                    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
                                    }`}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label
                                className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
                                    }`}
                            >
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                placeholder="john@example.com"
                                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${isDark
                                    ? "bg-slate-700 border-white/10 text-white focus:border-blue-500"
                                    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
                                    }`}
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label
                                className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"
                                    }`}
                            >
                                Bio
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) =>
                                    setFormData({ ...formData, bio: e.target.value })
                                }
                                placeholder="Tell us about yourself..."
                                maxLength={500}
                                rows={4}
                                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors resize-none ${isDark
                                    ? "bg-slate-700 border-white/10 text-white focus:border-blue-500"
                                    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
                                    }`}
                            />
                            <p
                                className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"
                                    }`}
                            >
                                {formData.bio.length}/500 characters
                            </p>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full mt-6 px-6 py-3 bg-linear-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {saving ? "Saving..." : "💾 Save Changes"}
                    </button>
                </div>



                {/* Danger Zone */}
                <div
                    className={`rounded-2xl p-6 shadow-lg border-2 ${isDark
                        ? "bg-red-900/20 border-red-500/50"
                        : "bg-red-50 border-red-300"
                        }`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">⚠️</span>
                        <h2
                            className={`text-xl font-bold ${isDark ? "text-red-400" : "text-red-700"
                                }`}
                        >
                            Danger Zone
                        </h2>
                    </div>

                    <p
                        className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                    >
                        Once you delete your account, there is no going back. Please be
                        certain.
                    </p>

                    <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg hover:scale-105"
                    >
                        🗑️ Delete Account
                    </button>
                </div>
            </form>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
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
                                Delete Account?
                            </h3>
                            <p
                                className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"
                                    }`}
                            >
                                This will delete your account.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all ${isDark
                                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                                    : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="flex-1 px-6 py-3 bg-linear-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold rounded-xl transition-all hover:scale-105 shadow-lg shadow-red-500/30"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
