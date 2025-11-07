import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type WalletState = {
  walletId: string | null;
  walletAddress: string | null;
  BalanceAda: string;
};

const initialState: WalletState = {
  walletId: null,
  walletAddress: null,
  BalanceAda: "0",
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    ConnectWallet: (
      state,
      action: PayloadAction<{
        walletId: string;
        address: string;
        BalanceAda: string;
      }>
    ) => {
      state.walletId = action.payload.walletId;
      state.walletAddress = action.payload.address;
      state.BalanceAda = action.payload.BalanceAda;
    },
    disconnectWallet: (state) => {
      state.walletId = null;
      state.walletAddress = null;
      state.BalanceAda = "0";
    },
  },
});

export const { ConnectWallet, disconnectWallet } = walletSlice.actions;
export default walletSlice.reducer;
