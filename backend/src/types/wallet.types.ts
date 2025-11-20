// src/types/wallet.types.ts

export interface AddWalletRequest {
  seedPhrase: string; // Mnemonic phrase
  ownerAddress: string;
  setDefault?: boolean;
}

export interface RemoveWalletRequest {
  address: string;
}

export interface WalletResponse {
  address: string;
  network: string;
}

export interface ListWalletsResponse {
  wallets: string[];
}

export interface BalanceResponse {
  address: string;
  ada: string;
  assets: Array<{
    unit: string;
    quantity: string;
    name?: string;
  }>;
}
