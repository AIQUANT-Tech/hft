// src/pages/WalletManagementPage.tsx

import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "sonner";
import { WalletContext } from "../App";
import { cardanoClient } from "@/services/cardano";

const API_URL = "http://localhost:8080";

interface WalletBalance {
  address: string;
  lovelace: string;
  ada: string;
  assets: any[];
}

export default function WalletManagementPage() {
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
  const [showAssetsModal, setShowAssetsModal] = useState(false); // ✅ Assets modal state
  const [selectedWalletAddress, setSelectedWalletAddress] =
    useState<string>(""); // ✅ Selected wallet
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [walletToFund, setWalletToFund] = useState<string>("");
  const [fundAmount, setFundAmount] = useState<string>("");
  const [funding, setFunding] = useState(false);

  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [newSeedPhrase, setNewSeedPhrase] = useState("");
  const [seedPhrase, setSeedPhrase] = useState("");

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/wallet/list`);
      console.log("Wallets response:", response.data);

      const addresses = response.data.wallets || [];
      setWallets(addresses);

      for (const address of addresses) {
        fetchBalance(address);
      }
    } catch (error) {
      console.error("Failed to fetch wallets:", error);
      toast.error("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async (address: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/wallet/balance/${address}`
      );
      if (response.data.success) {
        setWalletBalances((prev) => new Map(prev).set(address, response.data));
      }
    } catch (error) {
      console.error(`Failed to fetch balance for ${address}:`, error);
    }
  };

  const createWallet = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/wallet/create`);

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
      const response = await axios.post(`${API_URL}/api/wallet/add`, {
        seedPhrase: seedPhrase.trim(),
      });

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

  return (
    <div>
      <div className="mb-6 p-6 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-gray-300 dark:border-white/10">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              👛 Wallet Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Create, import, and manage your Cardano wallets
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:scale-105 transition-all"
            >
              + Create Wallet
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-lg hover:scale-105 transition-all"
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
        <div className="text-center py-20 text-gray-600 dark:text-gray-400">
          <p className="text-xl mb-4">No wallets found</p>
          <p className="text-sm">Create or import a wallet to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((address) => (
            <div
              key={address}
              className="p-6 bg-gradient-to-br from-white to-gray-100 dark:from-slate-900 dark:to-slate-800 border border-gray-300 dark:border-white/10 rounded-2xl shadow-lg hover:scale-105 transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#0033AD] to-[#00A3FF] flex items-center justify-center text-white font-bold text-xl">
                  👛
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-gray-900 dark:text-white font-bold truncate"
                    title={address}
                  >
                    {address.substring(0, 15)}...
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Preprod
                  </p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
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

              <div className="flex gap-2">
                <button
                  onClick={() => openFundModal(address)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:scale-105 transition-all text-sm"
                >
                  💰 Fund
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    toast.success("Address copied!");
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-gray-300 dark:border-white/10">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Create New Wallet
            </h3>

            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              A new wallet will be created with a random seed phrase. Make sure
              to save it securely!
            </p>

            {newWalletAddress && (
              <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-600 dark:text-green-400 text-sm font-semibold mb-2">
                  ✅ Wallet Created!
                </p>
                <p className="text-gray-900 dark:text-white text-sm font-mono break-all">
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:scale-105 transition-all"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWalletAddress("");
                }}
                className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-gray-300 dark:border-white/10">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Import Wallet
            </h3>

            <textarea
              placeholder="Enter your 24-word seed phrase (mnemonic)"
              value={seedPhrase}
              onChange={(e) => setSeedPhrase(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white mb-4 font-mono text-sm"
            />

            <p className="text-xs text-gray-500 mb-4">
              ⚠️ Your seed phrase will be stored securely on the server. Never
              share it with anyone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={importWallet}
                disabled={!seedPhrase.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSeedPhrase("");
                }}
                className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-gray-300 dark:border-white/10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Delete Wallet?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Are you sure you want to delete this wallet?
              </p>
            </div>

            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-xs font-semibold mb-2">
                ⚠️ WARNING: This action cannot be undone!
              </p>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-mono break-all">
                {walletToDelete.substring(0, 30)}...
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setWalletToDelete(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={deleteWallet}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold rounded-lg hover:scale-105 transition-all"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-gray-300 dark:border-white/10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">💰</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Fund Wallet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Send ADA from your browser wallet
              </p>
            </div>

            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                Recipient Address:
              </p>
              <p className="text-gray-900 dark:text-white text-sm font-mono break-all">
                {walletToFund.substring(0, 30)}...
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
                Amount (ADA)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="Enter amount in ADA (e.g., 10)"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-lg font-semibold"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Minimum: 1 ADA (network fees apply)
              </p>
            </div>

            {!browserWallet && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg">
                <p className="text-yellow-600 dark:text-yellow-400 text-xs">
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
                className="flex-1 px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all"
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {funding ? "Sending..." : "Fund Wallet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Assets Modal */}
      {showAssetsModal && selectedWalletAddress && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-gray-300 dark:border-white/10 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  📦 Wallet Assets
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-mono">
                  {selectedWalletAddress.substring(0, 20)}...
                </p>
              </div>
              <button
                onClick={() => setShowAssetsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* ADA Balance */}
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                    ADA Balance
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 text-2xl font-bold">
                    ₳ {getWalletBalance(selectedWalletAddress)}
                  </p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>

            {/* Assets List */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Native Assets ({getWalletAssets(selectedWalletAddress).length})
              </h4>

              {getWalletAssets(selectedWalletAddress).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-lg mb-2">No native assets</p>
                  <p className="text-sm">This wallet only contains ADA</p>
                </div>
              ) : (
                getWalletAssets(selectedWalletAddress).map(
                  (asset: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white font-semibold text-sm mb-1">
                            {asset.unit.substring(0, 16)}...
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-xs font-mono break-all">
                            Policy: {asset.unit.substring(0, 56)}
                          </p>
                          {asset.unit.length > 56 && (
                            <p className="text-gray-600 dark:text-gray-400 text-xs font-mono mt-1">
                              Asset: {asset.unit.substring(56)}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-gray-900 dark:text-white font-bold text-lg">
                            {asset.quantity}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
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
                className="w-full px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
