import type { RootState } from "@/redux/store";
import { disconnectWallet, ConnectWallet } from "@/redux/walletSlice";
import { BrowserWallet, type Wallet } from "@meshsdk/core";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/redux/store"; // ✅ Add this import
import { toast } from "sonner";
import Popup from "./Popup";
import { authConnect, logoutUser } from "../redux/authSlice";

const WalletConnect = () => {
  const dispatch = useDispatch<AppDispatch>(); // ✅ Type the dispatch
  const walletAddress = useSelector(
    (state: RootState) => state.wallet.walletAddress
  );
  const balance = useSelector((state: RootState) => state.wallet.BalanceAda);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);

  const connectWallet = async () => {
    const availableWallets = await BrowserWallet.getAvailableWallets();
    setWallets(availableWallets);
    setPopupOpen(true);
  };

  const selectWallet = async (walletId: string) => {
    console.log("Selected wallet:", walletId);
    try {
      const wallet = await BrowserWallet.enable(walletId);

      // Get balance
      const balances = await wallet.getBalance();
      const lovelaceAsset = balances.find((asset) => asset.unit === "lovelace");
      const adaBalance =
        lovelaceAsset && lovelaceAsset.quantity
          ? Number(lovelaceAsset.quantity) / 1_000_000
          : 0;

      const address = (await wallet.getChangeAddress()) || "N/A";

      // ✅ 1. Store in wallet slice first
      dispatch(
        ConnectWallet({
          walletId,
          address,
          BalanceAda: adaBalance.toString(),
        })
      );

      // ✅ 2. Authenticate with backend and WAIT for completion
      const result = await dispatch(authConnect(address)).unwrap();

      // ✅ 3. Show success message
      toast.success(
        result.isNewUser
          ? "🎉 Welcome! Account created successfully"
          : "👋 Welcome back!",
        { closeButton: true }
      );

      setPopupOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        console.log(error);
        toast.error(
          "Please activate 'Connect as DApp Account' in your wallet",
          { closeButton: true }
        );
      } else {
        toast.error("An unknown error occurred", {
          closeButton: true,
        });
      }
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

  // Format balance with commas
  const formatBalance = (bal: string) => {
    const num = parseFloat(bal);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="flex items-center gap-4">
      {!walletAddress ? (
        // Connect Wallet Button - Not Connected
        <button
          onClick={connectWallet}
          className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-[#0033AD] to-[#00A3FF] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden"
        >
          <span className="absolute inset-0 bg-linear-to-r from-[#00A3FF] to-[#0033AD] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          <svg
            className="w-5 h-5 relative z-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <span className="relative z-10">Connect Wallet</span>
        </button>
      ) : (
        // Wallet Connected - Show Address and Balance
        <div className="flex items-center gap-3">
          {/* Balance Card */}
          <div className="group relative bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl px-4 py-2.5 border border-blue-200/50 dark:border-blue-700/50 shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2">
              {/* ADA Symbol */}
              <div className="flex items-center justify-center w-8 h-8 bg-linear-to-br from-[#0033AD] to-[#00A3FF] rounded-lg shadow-sm">
                <span className="text-white font-bold text-sm">₳</span>
              </div>

              {/* Balance Info */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                  Balance
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatBalance(balance)}{" "}
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                    ADA
                  </span>
                </span>
              </div>
            </div>

            {/* Hover effect border */}
            <div className="absolute inset-0 rounded-xl bg-linear-to-r from-[#0033AD] to-[#00A3FF] opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </div>

          {/* Wallet Address Badge */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-md hover:shadow-lg transition-all duration-300">
            {/* Wallet Icon */}
            <div className="flex items-center justify-center w-8 h-8 bg-linear-to-br from-green-400 to-emerald-500 rounded-lg">
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Address */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Connected
              </span>
              <code className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </code>
            </div>

            {/* Disconnect Button */}
            <button
              onClick={disconnect}
              className="ml-2 p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all duration-200 group/disconnect"
              title="Disconnect Wallet"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Popup for Wallet Selection */}
      {popupOpen && (
        <Popup
          wallets={wallets}
          onSelectWallet={selectWallet}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </div>
  );
};

export default WalletConnect;
