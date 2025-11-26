import type { RootState } from "@/redux/store";
import { disconnectWallet, ConnectWallet } from "@/redux/walletSlice";
import { BrowserWallet, type Wallet } from "@meshsdk/core";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/redux/store";
import { toast } from "sonner";
import Popup from "./Popup";
import { authConnect, logoutUser } from "../redux/authSlice";
import { UserPen } from "lucide-react";
import { Link } from "react-router-dom";
import { selectIsDark } from "@/redux/themeSlice";

const WalletConnect = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isDark = useSelector(selectIsDark);
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

      //1. Store in wallet slice first
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
    <div className={`flex items-center gap-4 rounded-xl`}>
      {!walletAddress ? (
        // Connect Wallet Button - Not Connected
        <button
          onClick={connectWallet}
          className={`group relative inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden ${
            isDark
              ? "bg-linear-to-r from-purple-500 to-pink-500 text-white"
              : "bg-linear-to-r from-blue-600 to-cyan-600 text-white"
          }`}
        >
          {/* Hover effect overlay */}
          <span
            className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              isDark
                ? "bg-linear-to-r from-purple-600 to-pink-600"
                : "bg-linear-to-r from-blue-700 to-cyan-700"
            }`}
          ></span>

          {/* Wallet Icon */}
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

          {/* Button Text */}
          <span className="relative z-10">Connect Wallet</span>
        </button>
      ) : (
        // Wallet Connected - Show Address and Balance
        <div className="flex items-center gap-3">
          {/* Balance Card */}
          <div
            className={`group relative bg-linear-to-br rounded-xl px-4 py-2.5 border shadow-md hover:shadow-lg transition-all duration-300 ${
              isDark
                ? "from-blue-900/20 to-indigo-900/20 border-blue-700/50"
                : "from-blue-50 to-indigo-50 border-blue-200/50"
            }`}
          >
            <div className="flex items-center gap-2">
              {/* ADA Symbol */}
              <div className="flex items-center justify-center w-8 h-8 bg-linear-to-br from-[#0033AD] to-[#00A3FF] rounded-lg shadow-sm">
                <span
                  className={`font-bold text-sm ${
                    isDark ? "text-gray-200" : "text-white"
                  }`}
                >
                  ₳
                </span>
              </div>

              {/* Balance Info */}
              <div className="flex flex-col">
                <span
                  className={`text-xs font-medium uppercase tracking-wider ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Balance
                </span>
                <span
                  className={`text-lg font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatBalance(balance)}{" "}
                  <span
                    className={`text-sm font-normal ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
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
            <Link
              className="flex items-center justify-center w-8 h-8 bg-linear-to-br from-green-400 to-emerald-500 rounded-lg cursor-pointer"
              to="/profile"
              title="Go to Profile"
            >
              <UserPen className="text-white" />
            </Link>

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
