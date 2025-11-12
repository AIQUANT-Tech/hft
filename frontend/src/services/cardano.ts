import { BrowserWallet } from "@meshsdk/core";
import { Lucid, Blockfrost } from "lucid-cardano";
import type { Network, WalletApi } from "lucid-cardano";
import { toast } from "sonner";
import Big from "big.js"; // ✅ Import Big.js

export interface NetworkConfig {
  projectId: string;
  baseUrl: string;
  lucidNetwork: Network;
  cardanoScanUrl: string;
}

type MeshBrowserWallet = Awaited<ReturnType<typeof BrowserWallet.enable>>;
type MeshWalletApi = MeshBrowserWallet["walletInstance"];

/**
 * A Cardano client that selects network based on wallet network ID.
 * networkId 1 = Mainnet, 0 = Testnet (preprod/preview)
 */
export class Cardano {
  public lucidInstance: Lucid | null = null;
  private config!: NetworkConfig;

  private static NETWORKS: Record<number, NetworkConfig> = {
    1: {
      baseUrl: import.meta.env.VITE_BLOCKFROST_MAINNET_URL,
      projectId: import.meta.env.VITE_BLOCKFROST_MAINNET_PROJECT_ID,
      lucidNetwork: "Mainnet",
      cardanoScanUrl: import.meta.env.VITE_CARDANO_SCAN_MAINNET_URL!,
    },
    0: {
      baseUrl: import.meta.env.VITE_BLOCKFROST_URL,
      projectId: import.meta.env.VITE_BLOCKFROST_PROJECT_ID,
      lucidNetwork: "Preprod",
      cardanoScanUrl: import.meta.env.VITE_CARDANO_SCAN_URL!,
    },
  };

  public async init(networkId: number): Promise<void> {
    const cfg = Cardano.NETWORKS[networkId];
    if (!cfg) {
      throw new Error(
        `Unsupported network ID ${networkId}. Expected 0 (Testnet) or 1 (Mainnet).`
      );
    }
    this.config = cfg;

    if (!this.lucidInstance) {
      const { projectId, baseUrl, lucidNetwork } = this.config;
      if (!projectId) {
        throw new Error(
          "Missing Blockfrost project ID in environment for network ID " +
            networkId
        );
      }

      this.lucidInstance = await Lucid.new(
        new Blockfrost(baseUrl, projectId),
        lucidNetwork
      );
    }
  }

  public getLucid(): Lucid {
    if (!this.lucidInstance) {
      throw new Error("Lucid not initialized: call init(networkId) first.");
    }
    return this.lucidInstance;
  }

  public meshToLucidAdapter(meshApi: MeshWalletApi): WalletApi {
    return {
      getNetworkId: () => meshApi.getNetworkId(),
      getUtxos: () => meshApi.getUtxos(),
      getBalance: () => meshApi.getBalance(),
      getUsedAddresses: () => meshApi.getUsedAddresses(),
      getUnusedAddresses: () => meshApi.getUnusedAddresses(),
      getChangeAddress: () => meshApi.getChangeAddress(),
      getRewardAddresses: () => meshApi.getRewardAddresses(),
      getCollateral: () => meshApi.getCollateral().then((u) => u ?? []),
      signTx: (tx, partial) => meshApi.signTx(tx, partial),
      submitTx: (tx) => meshApi.submitTx(tx),
      signData: async (address, payload) => {
        const ds = await meshApi.signData(payload, address);
        return { signature: ds.signature, key: ds.key };
      },
      experimental: {
        getCollateral: () =>
          meshApi.experimental.getCollateral().then((u) => u ?? []),
        on: (_event, _cb) => {
          /* no-op */
        },
        off: (_event, _cb) => {
          /* no-op */
        },
      },
    };
  }

  /**
   * ✅ Fund wallet using Big.js for safe decimal handling
   * @param wallet - Browser wallet instance
   * @param amount - Amount in ADA (string or number)
   * @param address - Recipient address
   * @returns Transaction hash
   */
  public fundWallet = async (
    wallet: BrowserWallet,
    amount: string | number,
    address: string
  ): Promise<string> => {
    try {
      const walletApi = this.meshToLucidAdapter(wallet.walletInstance);

      // Initialize lucid if not initialized
      if (!this.lucidInstance) {
        const networkId = await walletApi.getNetworkId();
        await this.init(networkId);
      }

      const lucid = this.getLucid();
      lucid.selectWallet(walletApi);

      // ✅ Convert ADA to lovelace using Big.js
      // 1 ADA = 1,000,000 lovelace
      const amountBig = new Big(amount);
      const lovelace = amountBig.times(1_000_000);

      // Validate amount
      if (lovelace.lte(0)) {
        throw new Error("Amount must be greater than 0");
      }

      // Convert to BigInt (remove decimals if any)
      const lovelaceBigInt = BigInt(
        lovelace.round(0, Big.roundDown).toString()
      );

      console.log(
        `💰 Funding ${amount} ADA (${lovelaceBigInt} lovelace) to ${address.substring(
          0,
          20
        )}...`
      );

      // Get sender address
      const senderAddress = await lucid.wallet.address();
      console.log(`📤 From: ${senderAddress.substring(0, 20)}...`);

      // Build the transaction
      const tx = await lucid
        .newTx()
        .payToAddress(address, { lovelace: lovelaceBigInt })
        .complete();

      console.log("📝 Transaction built, signing...");

      // Sign transaction
      const signed = await tx.sign().complete();

      console.log("✍️ Transaction signed, submitting...");

      // Submit transaction
      const txHash = await signed.submit();

      console.log(`✅ Transaction submitted: ${txHash}`);

      toast.success(`Successfully sent ${amount} ADA!`, {
        description: `TX: ${txHash.substring(0, 20)}...`,
        closeButton: true,
      });

      return txHash;
    } catch (error: any) {
      console.error("❌ Error funding wallet:", error);

      // Better error messages
      let errorMsg = "Failed to send transaction";
      if (error.message) {
        errorMsg = error.message;
      } else if (error.info) {
        errorMsg = error.info;
      }

      toast.error(errorMsg, {
        closeButton: true,
      });

      throw error;
    }
  };
}

// Create and export a single client instance
export const cardanoClient = new Cardano();
