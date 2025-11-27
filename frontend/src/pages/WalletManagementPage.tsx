// src/pages/WalletManagementPage.tsx

import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "sonner";
import { WalletContext } from "../App";
import { cardanoClient } from "@/services/cardano";
import { useSelector } from "react-redux";
import { selectAuth } from "../redux/authSlice";
import { selectIsDark } from "@/redux/themeSlice";

const API_URL = import.meta.env.VITE_SERVER_URL;

interface WalletBalance {
  address: string;
  lovelace: string;
  ada: string;
  assets: any[];
}

export default function WalletManagementPage() {
  const isDark = useSelector(selectIsDark);
  const browserWallet = useContext(WalletContext);
  const [wallets, setWallets] = useState<string[]>([]);
  const [walletBalances, setWalletBalances] = useState<
    Map<string, WalletBalance>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [selectedWalletAddress, setSelectedWalletAddress] =
    useState<string>(""); // ✅ Selected wallet
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [walletToFund, setWalletToFund] = useState<string>("");
  const [fundAmount, setFundAmount] = useState<string>("");
  const [funding, setFunding] = useState(false);

  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [newSeedPhrase, setNewSeedPhrase] = useState("");
  const [seedPhrase, setSeedPhrase] = useState("");

  const { isAuthenticated, user } = useSelector(selectAuth);

  // Add these states at the top of your WalletManagement component

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawWallet, setWithdrawWallet] = useState<string | null>(null);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const closeWithdrawModal = () => {
    setShowWithdrawModal(false);
    setWithdrawWallet(null);
    setWithdrawAddress("");
  };

  // ✅ Only fetch wallets when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWallets();
    }
  }, [isAuthenticated, user]); // Depend on auth state, not walletId

  // src/pages/WalletManagementPage.tsx

  const fetchBalance = async (address: string) => {
    try {
      // ✅ Ensure address is a string
      if (typeof address !== "string") {
        console.error("Invalid address:", address);
        return;
      }

      const response = await axios.get(
        `${API_URL}/api/wallet/balance/${address}`,
        { withCredentials: true } // ✅ Add this
      );

      if (response.data.success) {
        setWalletBalances((prev) => new Map(prev).set(address, response.data));
      }
    } catch (error) {
      console.error(`Failed to fetch balance for ${address}:`, error);
    }
  };

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/wallet/list`, {
        withCredentials: true,
      });
      console.log("Wallets response:", response.data);

      const addresses = response.data.wallets || [];

      // ✅ Validate that addresses is an array of strings
      if (!Array.isArray(addresses)) {
        console.error("Invalid wallet list format:", addresses);
        toast.error("Invalid wallet data received");
        return;
      }

      setWallets(addresses);

      // ✅ Fetch balances for each wallet
      for (const address of addresses) {
        if (typeof address === "string") {
          fetchBalance(address);
        } else {
          console.error("Invalid address in list:", address);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch wallets:", error);

      if (error.response?.status === 401) {
        toast.error("Please connect your wallet to view backend wallets");
      } else {
        toast.error("Failed to load wallets");
      }
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/wallet/create`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Wallet created successfully!");
        setNewWalletAddress(response.data.address);
        setNewSeedPhrase(response.data.mnemonic);
        fetchWallets();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create wallet");
    }
  };

  const importWallet = async () => {
    if (!seedPhrase.trim()) {
      toast.error("Please enter a seed phrase");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/wallet/add`,
        {
          seedPhrase: seedPhrase.trim(),
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Wallet imported successfully!");
        setShowImportModal(false);
        setSeedPhrase("");
        fetchWallets();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to import wallet");
    }
  };

  const confirmDeleteWallet = (address: string) => {
    setWalletToDelete(address);
    setShowDeleteModal(true);
  };

  const deleteWallet = async () => {
    if (!walletToDelete) return;

    try {
      const response = await axios.delete(`${API_URL}/api/wallet/remove`, {
        data: { address: walletToDelete },
        withCredentials: true,
      });

      if (response.data.success) {
        toast.success("Wallet deleted successfully");
        setShowDeleteModal(false);
        setWalletToDelete(null);
        fetchWallets();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete wallet");
    }
  };

  const [selectedAssetsToWithdraw, setSelectedAssetsToWithdraw] = useState<
    Map<string, { selected: boolean; amount: string }>
  >(new Map());

  // ✅ Reset when opening modal
  const openWithdrawModal = (address: string) => {
    setWithdrawWallet(address);
    setWithdrawAddress("");

    // Initialize with ADA
    const initialAssets = new Map();
    initialAssets.set("ADA", { selected: false, amount: "" });

    // Add all native assets
    const assets = walletBalances.get(address)?.assets || [];
    assets.forEach((asset: any) => {
      initialAssets.set(asset.unit, { selected: false, amount: "" });
    });

    setSelectedAssetsToWithdraw(initialAssets);
    setShowWithdrawModal(true);
  };

  // ✅ Toggle asset selection
  const toggleAssetSelection = (assetKey: string) => {
    setSelectedAssetsToWithdraw((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(assetKey);
      if (current) {
        newMap.set(assetKey, { ...current, selected: !current.selected });
      }
      return newMap;
    });
  };

  // ✅ Update asset amount
  const updateAssetAmount = (assetKey: string, amount: string) => {
    setSelectedAssetsToWithdraw((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(assetKey);
      if (current) {
        newMap.set(assetKey, { ...current, amount });
      }
      return newMap;
    });
  };

  // ✅ Update withdraw handler
  const handleWithdraw = async () => {
    if (!withdrawWallet || !withdrawAddress) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!withdrawAddress.startsWith("addr")) {
      toast.error("Invalid Cardano address");
      return;
    }

    // ✅ Build assets array from selections
    const assetsToWithdraw: { asset: string; amount: number }[] = [];

    for (const [assetKey, data] of selectedAssetsToWithdraw) {
      if (data.selected && data.amount) {
        const amount = parseFloat(data.amount);
        if (isNaN(amount) || amount <= 0) {
          toast.error(
            `Invalid amount for ${assetKey === "ADA" ? "ADA" : "asset"}`
          );
          return;
        }
        assetsToWithdraw.push({ asset: assetKey, amount });
      }
    }

    if (assetsToWithdraw.length === 0) {
      toast.error("Please select at least one asset to withdraw");
      return;
    }

    try {
      setIsWithdrawing(true);

      const response = await axios.post(
        `${API_URL}/api/wallet/withdraw`,
        {
          fromAddress: withdrawWallet,
          toAddress: withdrawAddress,
          assets: assetsToWithdraw, // ✅ Send array
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success(
          `Withdrawal successful! TX: ${response.data.txHash.substring(
            0,
            20
          )}...`
        );
        closeWithdrawModal();
        fetchBalance(withdrawWallet);
      } else {
        toast.error(response.data.error || "Withdrawal failed");
      }
    } catch (error: any) {
      console.error("Withdraw error:", error);
      toast.error(error.response?.data?.error || "Failed to withdraw");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // ✅ Get asset info
  const getAssetInfo = (assetUnit: string) => {
    if (!withdrawWallet) return null;
    const balance = walletBalances.get(withdrawWallet);
    if (!balance) return null;

    if (assetUnit === "ADA") {
      return { name: "ADA", balance: balance.ada, decimals: 6 };
    }

    const asset = balance.assets?.find((a: any) => a.unit === assetUnit);
    return asset
      ? {
          name: assetUnit.substring(0, 20) + "...",
          balance: asset.quantity,
          decimals: 0,
        }
      : null;
  };

  const openFundModal = (address: string) => {
    setWalletToFund(address);
    setFundAmount("");
    setShowFundModal(true);
  };

  // ✅ Open assets modal
  const openAssetsModal = (address: string) => {
    setSelectedWalletAddress(address);
    setShowAssetsModal(true);
  };

  const fundWalletWithBrowserWallet = async () => {
    try {
      if (!browserWallet) {
        throw new Error("No browser wallet available");
      }
      setFunding(true);
      const funding = await cardanoClient.fundWallet(
        browserWallet,
        fundAmount,
        walletToFund
      );

      if (funding) {
        toast.success("Wallet funded successfully!");
        setShowFundModal(false);
        fetchWallets();
      }
    } catch (error: any) {
      console.error("Failed to fund wallet:", error);
      toast.error(error.message || "Failed to send transaction");
    } finally {
      setFunding(false);
    }
  };

  const getWalletBalance = (address: string): string => {
    const balance = walletBalances.get(address);
    return balance ? balance.ada : "Loading...";
  };

  // ✅ Get wallet assets
  const getWalletAssets = (address: string) => {
    const balance = walletBalances.get(address);
    return balance?.assets || [];
  };

  // ✅ Show message if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="text-center py-20">
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 ${
            isDark ? "bg-slate-800" : "bg-gray-100"
          }`}
        >
          <span className="text-5xl">👛</span>
        </div>
        <h3
          className={`text-2xl font-bold mb-2 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Connect Your Wallet
        </h3>
        <p className={`text-sm ${isDark ? "text-gray-200" : "text-gray-600"}`}>
          Please connect your browser wallet to manage backend wallets
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`mb-6 p-6 bg-linear-to-r rounded-2xl border ${
          isDark
            ? "from-slate-900 to-slate-800 border-white/10"
            : "from-gray-100 to-gray-200 border-gray-300"
        }`}
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2
              className={`text-2xl font-bold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              👛 Wallet Management
            </h2>
            <p
              className={`text-sm ${
                isDark ? "text-gray-200" : "text-gray-600"
              }`}
            >
              Create, import, and manage your Cardano wallets
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-linear-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:scale-105 transition-all"
            >
              + Create Wallet
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-6 py-3 bg-linear-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-lg hover:scale-105 transition-all"
            >
              📥 Import Wallet
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : wallets.length === 0 ? (
        <div
          className={`text-center py-20 ${
            isDark ? "text-gray-200" : "text-gray-600"
          }`}
        >
          <p className="text-xl mb-4">No wallets found</p>
          <p className="text-sm">Create or import a wallet to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((address) => (
            <div
              key={address}
              className={`p-6 bg-linear-to-br border rounded-2xl shadow-lg hover:scale-105 transition-all ${
                isDark
                  ? "from-slate-900 to-slate-800 border-white/10"
                  : "from-white to-gray-50 border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-linear-to-r from-[#0033AD] to-[#00A3FF] flex items-center justify-center text-white font-bold text-xl">
                  👛
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-bold truncate ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                    title={address}
                  >
                    {address.substring(0, 15)}...
                  </p>
                  <p
                    className={`text-sm ${
                      isDark ? "text-gray-200" : "text-gray-600"
                    }`}
                  >
                    Preprod
                  </p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p
                  className={`text-xs mb-1 ${
                    isDark ? "text-gray-200" : "text-gray-600"
                  }`}
                >
                  Balance
                </p>
                <p className="text-blue-400 font-bold text-lg">
                  ₳ {getWalletBalance(address)}
                </p>
                {/* ✅ Button to open assets modal */}
                <button
                  onClick={() => openAssetsModal(address)}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-400 font-semibold"
                >
                  📦 View Assets ({getWalletAssets(address).length})
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => openFundModal(address)}
                  className="flex-1 px-4 py-2 bg-linear-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:scale-105 transition-all text-sm"
                >
                  💰 Fund
                </button>

                {/* ✅ NEW: Withdraw Button */}
                <button
                  onClick={() => openWithdrawModal(address)}
                  className="flex-1 px-4 py-2 bg-linear-to-r from-orange-600 to-orange-500 text-white font-semibold rounded-lg hover:scale-105 transition-all text-sm"
                >
                  💸 Withdraw
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    toast.success("Address copied!");
                  }}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    isDark
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-300 text-gray-900 hover:bg-gray-400"
                  }`}
                  title="Copy address"
                >
                  📋
                </button>
                <button
                  onClick={() => {
                    fetchBalance(address);
                    toast.info("Balance refreshed");
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  title="Refresh balance"
                >
                  🔄
                </button>
                <button
                  onClick={() => confirmDeleteWallet(address)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                  title="Delete wallet"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Wallet Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl p-8 max-w-md w-full border ${
              isDark
                ? "bg-slate-900 border-white/10"
                : "bg-white border-gray-300"
            }`}
          >
            <h3
              className={`text-2xl font-bold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Create New Wallet
            </h3>

            <p
              className={`text-sm mb-4 ${
                isDark ? "text-gray-200" : "text-gray-600"
              }`}
            >
              A new wallet will be created with a random seed phrase. Make sure
              to save it securely!
            </p>

            {newWalletAddress && (
              <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p
                  className={`text-sm font-semibold mb-2 ${
                    isDark ? "text-green-400" : "text-green-600"
                  }`}
                >
                  ✅ Wallet Created!
                </p>
                <p
                  className={`text-sm font-mono break-all ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {newSeedPhrase}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newSeedPhrase);
                    toast.success("Seed phrase copied!");
                  }}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-400"
                >
                  📋 Copy Seed Phrase
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={createWallet}
                className="flex-1 px-6 py-3 bg-linear-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:scale-105 transition-all"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWalletAddress("");
                }}
                className={`px-6 py-3 font-semibold rounded-lg transition-all ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-300 text-gray-900 hover:bg-gray-400"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Wallet Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl p-8 max-w-md w-full border ${
              isDark
                ? "bg-slate-900 border-white/10"
                : "bg-white border-gray-300"
            }`}
          >
            <h3
              className={`text-2xl font-bold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Import Wallet
            </h3>

            <textarea
              placeholder="Enter your 24-word seed phrase (mnemonic)"
              value={seedPhrase}
              onChange={(e) => setSeedPhrase(e.target.value)}
              rows={4}
              className={`w-full px-4 py-3 rounded-lg border mb-4 font-mono text-sm ${
                isDark
                  ? "bg-slate-800 border-white/10 text-white"
                  : "bg-gray-100 border-gray-300 text-gray-900"
              }`}
            />

            <p
              className={`text-xs mb-4 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              ⚠️ Your seed phrase will be stored securely on the server. Never
              share it with anyone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={importWallet}
                disabled={!seedPhrase.trim()}
                className="flex-1 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSeedPhrase("");
                }}
                className={`px-6 py-3 font-semibold rounded-lg transition-all ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-300 text-gray-900 hover:bg-gray-400"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && walletToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl p-8 max-w-md w-full border ${
              isDark
                ? "bg-slate-900 border-white/10"
                : "bg-white border-gray-300"
            }`}
          >
            <div className="text-center mb-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isDark ? "bg-red-500/20" : "bg-red-100"
                }`}
              >
                <span className="text-4xl">⚠️</span>
              </div>
              <h3
                className={`text-2xl font-bold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Delete Wallet?
              </h3>
              <p
                className={`text-sm ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Are you sure you want to delete this wallet?
              </p>
            </div>

            <div
              className={`mb-6 p-4 rounded-lg ${
                isDark
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p
                className={`text-xs font-semibold mb-2 ${
                  isDark ? "text-red-400" : "text-red-600"
                }`}
              >
                ⚠️ WARNING: This action cannot be undone!
              </p>
              <p
                className={`text-sm font-mono break-all ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {walletToDelete.substring(0, 30)}...
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setWalletToDelete(null);
                }}
                className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-300 text-gray-900 hover:bg-gray-400"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={deleteWallet}
                className="flex-1 px-6 py-3 bg-linear-to-r from-red-600 to-red-500 text-white font-semibold rounded-lg hover:scale-105 transition-all"
              >
                Delete Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fund Wallet Modal */}
      {showFundModal && walletToFund && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl p-8 max-w-md w-full border ${
              isDark
                ? "bg-slate-900 border-white/10"
                : "bg-white border-gray-300"
            }`}
          >
            <div className="text-center mb-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isDark ? "bg-green-500/20" : "bg-green-100"
                }`}
              >
                <span className="text-4xl">💰</span>
              </div>
              <h3
                className={`text-2xl font-bold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Fund Wallet
              </h3>
              <p
                className={`text-sm ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Send ADA from your browser wallet
              </p>
            </div>

            <div
              className={`mb-6 p-4 rounded-lg ${
                isDark
                  ? "bg-blue-500/10 border-blue-500/20"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <p
                className={`text-xs mb-1 ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Recipient Address:
              </p>
              <p
                className={`text-sm font-mono break-all ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {walletToFund.substring(0, 30)}...
              </p>
            </div>

            <div className="mb-6">
              <label
                className={`block text-sm font-semibold mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Amount (ADA)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="Enter amount in ADA (e.g., 10)"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg ${
                  isDark
                    ? "bg-slate-800 border-white/10 text-white"
                    : "bg-gray-100 border-gray-300 text-gray-900"
                } text-lg font-semibold`}
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Minimum: 1 ADA (network fees apply)
              </p>
            </div>

            {!browserWallet && (
              <div
                className={`mb-4 p-3 rounded-lg ${
                  isDark
                    ? "bg-yellow-500/10 border-yellow-500/20"
                    : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <p
                  className={`text-xs ${
                    isDark ? "text-yellow-400" : "text-yellow-600"
                  }`}
                >
                  ⚠️ Please connect your browser wallet first!
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFundModal(false);
                  setWalletToFund("");
                  setFundAmount("");
                }}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-300 text-gray-900 hover:bg-gray-400"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={fundWalletWithBrowserWallet}
                disabled={
                  funding ||
                  !browserWallet ||
                  !fundAmount ||
                  parseFloat(fundAmount) <= 0
                }
                className="flex-1 px-6 py-3 bg-linear-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {funding ? "Sending..." : "Fund Wallet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Assets Modal */}
      {showAssetsModal && selectedWalletAddress && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${
            isDark ? "bg-white/20 backdrop-blur" : "bg-black/80 backdrop-blur"
          }`}
        >
          <div
            className={`rounded-2xl p-8 max-w-2xl w-full border max-h-[80vh] overflow-y-auto ${
              isDark
                ? "border-b border-white/10 bg-slate-800"
                : "border-b border-gray-300 bg-slate-50"
            }`}
          >
            <div className={`flex items-center justify-between mb-6`}>
              <div>
                <h3
                  className={`text-2xl font-bold mb-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  📦 Wallet Assets
                </h3>
                <p
                  className={`text-sm font-mono ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {selectedWalletAddress.substring(0, 20)}...
                </p>
              </div>
              <button
                onClick={() => setShowAssetsModal(false)}
                className={`text-gray-500 hover:text-gray-700 ${
                  isDark ? "text-gray-400 hover:text-gray-200" : ""
                }`}
              >
                ✕
              </button>
            </div>
            {/* ADA Balance */}
            <div
              className={`mb-4 p-4 border rounded-lg ${
                isDark
                  ? "bg-blue-500/10 border-blue-500/20"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-xs mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    ADA Balance
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      isDark ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    ₳ {getWalletBalance(selectedWalletAddress)}
                  </p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>

            {/* Assets List */}
            <div className="space-y-3">
              <h4
                className={`text-lg font-semibold mb-3 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Native Assets ({getWalletAssets(selectedWalletAddress).length})
              </h4>

              {getWalletAssets(selectedWalletAddress).length === 0 ? (
                <div
                  className={`text-center py-8 ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  <p className="text-lg mb-2">No native assets</p>
                  <p className="text-sm">This wallet only contains ADA</p>
                </div>
              ) : (
                getWalletAssets(selectedWalletAddress).map(
                  (asset: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        isDark
                          ? "bg-slate-800 border-white/10"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p
                            className={`font-semibold text-sm mb-1 ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {asset.unit.substring(0, 16)}...
                          </p>
                          <p
                            className={`text-xs font-mono break-all ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Policy: {asset.unit.substring(0, 56)}
                          </p>
                          {asset.unit.length > 56 && (
                            <p
                              className={`text-xs font-mono mt-1 ${
                                isDark ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              Asset: {asset.unit.substring(56)}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p
                            className={`font-bold text-lg ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {asset.quantity}
                          </p>
                          <p
                            className={`text-xs ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Quantity
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowAssetsModal(false)}
                className={`w-full px-6 py-3 ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-300 text-gray-900 hover:bg-gray-400"
                } font-semibold rounded-lg transition-all`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Multi-Asset Withdraw Modal */}
      {showWithdrawModal && withdrawWallet && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl p-8 max-w-2xl w-full border ${
              isDark
                ? "border-white/10 bg-slate-900"
                : "border-gray-300 bg-white"
            } shadow-2xl max-h-[90vh] overflow-y-auto`}
          >
            <div className="text-center mb-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isDark ? "bg-orange-500/20" : "bg-orange-100"
                }`}
              >
                <span className="text-4xl">💸</span>
              </div>
              <h3
                className={`text-2xl font-bold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Withdraw Assets
              </h3>
              <p
                className={`text-sm ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                From: {withdrawWallet.substring(0, 20)}...
              </p>
            </div>

            <div className="space-y-4">
              {/* Recipient Address */}
              <div>
                <label
                  className={`block text-sm font-semibold mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Recipient Address *
                </label>
                <input
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="addr1..."
                  className={`w-full px-4 py-3 rounded-xl bg-gray-50 placeholder-gray-500 focus:border-orange-500 focus:outline-none border-white/10 text-gray-900 ${
                    isDark && "bg-slate-800 border-2 border-gray-200 text-white"
                  }`}
                />
              </div>

              {/* Asset Selection */}
              <div>
                <label
                  className={`block text-sm font-semibold mb-3 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Select Assets to Withdraw
                </label>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {/* ADA */}
                  {(() => {
                    const adaData = selectedAssetsToWithdraw.get("ADA");
                    const adaInfo = getAssetInfo("ADA");

                    return (
                      <div
                        className={`p-4 rounded-xl ${
                          isDark
                            ? "bg-blue-500/10 border-2 border-blue-500/30"
                            : "bg-blue-50 border-2 border-blue-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={adaData?.selected || false}
                            onChange={() => toggleAssetSelection("ADA")}
                            className="w-5 h-5 mt-1 rounded border-2 border-blue-400 text-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p
                                  className={`font-bold ${
                                    isDark ? "text-white" : "text-gray-900"
                                  }`}
                                >
                                  💰 ADA (Cardano)
                                </p>
                                <p
                                  className={`text-xs ${
                                    isDark ? "text-gray-400" : "text-gray-600"
                                  }`}
                                >
                                  Available: ₳{adaInfo?.balance || "0"}
                                </p>
                              </div>
                            </div>

                            {adaData?.selected && (
                              <div className="mt-3">
                                <input
                                  type="number"
                                  step="0.000001"
                                  value={adaData.amount}
                                  onChange={(e) =>
                                    updateAssetAmount("ADA", e.target.value)
                                  }
                                  placeholder="Amount"
                                  className={`w-full px-3 py-2 rounded-lg ${
                                    isDark
                                      ? "bg-slate-800 border-blue-500/50 text-white"
                                      : "bg-white border-blue-300 text-gray-900"
                                  } border-2 focus:border-blue-500 focus:outline-none`}
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() =>
                                      updateAssetAmount(
                                        "ADA",
                                        (
                                          parseFloat(adaInfo?.balance || "0") *
                                          0.25
                                        ).toFixed(6)
                                      )
                                    }
                                    className={`flex-1 px-2 py-1 rounded text-xs hover:bg-blue-300 ${
                                      isDark
                                        ? "bg-blue-700 text-blue-200 hover:bg-blue-600"
                                        : "bg-blue-200 text-blue-900"
                                    }`}
                                  >
                                    25%
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateAssetAmount(
                                        "ADA",
                                        (
                                          parseFloat(adaInfo?.balance || "0") *
                                          0.5
                                        ).toFixed(6)
                                      )
                                    }
                                    className={`flex-1 px-2 py-1 rounded text-xs hover:bg-blue-300 ${
                                      isDark
                                        ? "bg-blue-700 text-blue-200 hover:bg-blue-600"
                                        : "bg-blue-200 text-blue-900"
                                    }`}
                                  >
                                    50%
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateAssetAmount(
                                        "ADA",
                                        (
                                          parseFloat(adaInfo?.balance || "0") *
                                          0.75
                                        ).toFixed(6)
                                      )
                                    }
                                    className={`flex-1 px-2 py-1 rounded text-xs hover:bg-blue-300 ${
                                      isDark
                                        ? "bg-blue-700 text-blue-200 hover:bg-blue-600"
                                        : "bg-blue-200 text-blue-900"
                                    }`}
                                  >
                                    75%
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateAssetAmount(
                                        "ADA",
                                        Math.max(
                                          0,
                                          parseFloat(adaInfo?.balance || "0") -
                                            2
                                        ).toFixed(6)
                                      )
                                    }
                                    className={`flex-1 px-2 py-1 rounded text-xs hover:bg-blue-300 ${
                                      isDark
                                        ? "bg-blue-700 text-blue-200 hover:bg-blue-600"
                                        : "bg-blue-200 text-blue-900"
                                    }`}
                                  >
                                    Max
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Native Assets */}
                  {walletBalances
                    .get(withdrawWallet)
                    ?.assets?.map((asset: any) => {
                      const assetData = selectedAssetsToWithdraw.get(
                        asset.unit
                      );

                      return (
                        <div
                          key={asset.unit}
                          className={`p-4 ${
                            isDark
                              ? "bg-slate-800 border-white/10"
                              : "bg-gray-50 border-gray-200"
                          } border-2 rounded-xl`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={assetData?.selected || false}
                              onChange={() => toggleAssetSelection(asset.unit)}
                              className="w-5 h-5 mt-1 rounded border-2 border-gray-400 text-orange-500 focus:ring-2 focus:ring-orange-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p
                                    className={`font-bold ${
                                      isDark ? "text-white" : "text-gray-900"
                                    } text-sm`}
                                  >
                                    📦 {asset.unit.substring(0, 20)}...
                                  </p>
                                  <p
                                    className={`text-xs ${
                                      isDark ? "text-gray-400" : "text-gray-600"
                                    } font-mono`}
                                  >
                                    {asset.unit.substring(0, 56)}
                                  </p>
                                  <p
                                    className={`text-xs ${
                                      isDark ? "text-gray-400" : "text-gray-500"
                                    } mt-1`}
                                  >
                                    Available: {asset.quantity}
                                  </p>
                                </div>
                              </div>

                              {assetData?.selected && (
                                <div className="mt-3">
                                  <input
                                    type="number"
                                    step="1"
                                    value={assetData.amount}
                                    onChange={(e) =>
                                      updateAssetAmount(
                                        asset.unit,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Amount"
                                    max={asset.quantity}
                                    className={`w-full px-3 py-2 rounded-lg ${
                                      isDark
                                        ? "bg-slate-700 border-white/20 text-white"
                                        : "bg-white border-gray-300 text-gray-900"
                                    } focus:border-orange-500 focus:outline-none`}
                                  />
                                  <button
                                    onClick={() =>
                                      updateAssetAmount(
                                        asset.unit,
                                        asset.quantity
                                      )
                                    }
                                    className={`mt-2 w-full px-3 py-1 rounded text-xs hover:bg-orange-300 ${
                                      isDark
                                        ? "bg-orange-700 text-orange-200 hover:bg-orange-600"
                                        : "bg-orange-200 text-orange-900"
                                    }`}
                                  >
                                    Send All ({asset.quantity})
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Warning */}
              <div
                className={`bg-yellow-50 ${
                  isDark
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "border-yellow-200"
                } border-2 rounded-xl p-3`}
              >
                <p
                  className={`text-xs ${
                    isDark ? "text-yellow-400" : "text-yellow-700"
                  }`}
                >
                  ⚠️ Double-check the recipient address and amounts.
                  Transactions cannot be reversed!
                  {Array.from(selectedAssetsToWithdraw.values()).filter(
                    (a) => a.selected
                  ).length === 0 && (
                    <strong className="block mt-1">
                      Please select at least one asset to withdraw.
                    </strong>
                  )}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeWithdrawModal}
                disabled={isWithdrawing}
                className={`flex-1 px-6 py-3 ${
                  isDark
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                } font-semibold rounded-xl transition-all disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={
                  isWithdrawing ||
                  !withdrawAddress ||
                  Array.from(selectedAssetsToWithdraw.values()).filter(
                    (a) => a.selected && a.amount
                  ).length === 0
                }
                className="flex-1 px-6 py-3 bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold rounded-xl transition-all hover:scale-105 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isWithdrawing
                  ? "Withdrawing..."
                  : `💸 Withdraw ${
                      Array.from(selectedAssetsToWithdraw.values()).filter(
                        (a) => a.selected
                      ).length
                    } Asset(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
