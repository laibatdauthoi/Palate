"use client";

import {
  AptosWalletAdapterProvider,
  useWallet,
  type AdapterNotDetectedWallet,
  type AdapterWallet
} from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { WalletStatus } from "@/types/palate";

type WalletContextValue = {
  walletStatus: WalletStatus;
  walletAddress: string | null;
  walletName: string | null;
  networkName: string | null;
  availableWallets: ReadonlyArray<AdapterWallet>;
  notDetectedWallets: ReadonlyArray<AdapterNotDetectedWallet>;
  connectingWalletName: string | null;
  walletError: string | null;
  connectWallet: (walletName: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function normalizeAddress(address: unknown): string | null {
  if (!address) return null;
  if (typeof address === "string") return address;
  if (typeof address === "object" && "toString" in address && typeof address.toString === "function") {
    return address.toString();
  }
  return null;
}

function WalletBridge({ children }: { children: ReactNode }) {
  const {
    account,
    connect,
    connected,
    disconnect,
    isLoading,
    network,
    notDetectedWallets,
    wallet,
    wallets
  } = useWallet();
  const [connectingWalletName, setConnectingWalletName] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const walletAddress = normalizeAddress(account?.address);
  const networkName = network?.name ? String(network.name) : null;
  const wrongNetwork = connected && networkName !== null && networkName.toLowerCase() !== Network.TESTNET;

  const walletStatus: WalletStatus = walletError
    ? "error"
    : isLoading || connectingWalletName
      ? "connecting"
      : wrongNetwork
        ? "wrong_network"
        : connected
          ? "connected"
          : "disconnected";

  const value = useMemo<WalletContextValue>(
    () => ({
      walletStatus,
      walletAddress,
      walletName: wallet?.name ?? null,
      networkName,
      availableWallets: wallets,
      notDetectedWallets,
      connectingWalletName,
      walletError,
      connectWallet: async (nextWalletName: string) => {
        setWalletError(null);
        setConnectingWalletName(nextWalletName);
        try {
          await Promise.resolve(connect(nextWalletName));
        } catch (error) {
          setWalletError(error instanceof Error ? error.message : "Wallet connection failed.");
        } finally {
          setConnectingWalletName(null);
        }
      },
      disconnectWallet: async () => {
        setWalletError(null);
        await Promise.resolve(disconnect());
      }
    }),
    [
      connect,
      connectingWalletName,
      disconnect,
      networkName,
      notDetectedWallets,
      wallet?.name,
      walletAddress,
      walletError,
      walletStatus,
      wallets
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect
      dappConfig={{ network: Network.TESTNET }}
      disableTelemetry
      onError={(error) => {
        console.error("Aptos wallet adapter error", error);
      }}
    >
      <WalletBridge>{children}</WalletBridge>
    </AptosWalletAdapterProvider>
  );
}

export function usePalateWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("usePalateWallet must be used inside WalletProvider");
  }

  return context;
}
