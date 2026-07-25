"use client";

import {
  AptosWalletAdapterProvider,
  useWallet,
  type AdapterNotDetectedWallet,
  type AdapterWallet
} from "@aptos-labs/wallet-adapter-react";
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-core";
import { Network } from "@aptos-labs/ts-sdk";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getWalletAptBalance } from "@/services/aptos_service";
import type { WalletDisplayState, WalletStatus } from "@/types/palate";

type WalletContextValue = {
  walletStatus: WalletStatus;
  walletDisplayState: WalletDisplayState;
  walletAddress: string | null;
  walletName: string | null;
  networkName: string | null;
  providerReady: boolean;
  walletBalance: string | null;
  walletBalanceStatus: "idle" | "loading" | "ready" | "error";
  walletBalanceError: string | null;
  availableWallets: ReadonlyArray<AdapterWallet>;
  notDetectedWallets: ReadonlyArray<AdapterNotDetectedWallet>;
  connectingWalletName: string | null;
  switchNetworkPending: boolean;
  walletError: string | null;
  connectWallet: (walletName: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchWalletNetwork: () => Promise<void>;
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<string>;
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
    changeNetwork,
    disconnect,
    isLoading,
    network,
    notDetectedWallets,
    signAndSubmitTransaction,
    wallet,
    wallets
  } = useWallet();
  const [connectingWalletName, setConnectingWalletName] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [switchNetworkPending, setSwitchNetworkPending] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [walletBalanceStatus, setWalletBalanceStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [walletBalanceError, setWalletBalanceError] = useState<string | null>(null);
  const lastResolvedWalletAddressRef = useRef<string | null>(null);

  const walletAddress = normalizeAddress(account?.address);
  const networkName = network?.name ? String(network.name) : null;
  const wrongNetwork = connected && networkName !== null && networkName.toLowerCase() !== Network.TESTNET;
  const providerReady = wallets.length > 0 || notDetectedWallets.length > 0;
  const hasConnectedAccount = connected && Boolean(walletAddress);
  const adapterTransitioning = isLoading || Boolean(connectingWalletName) || (connected && !walletAddress);

  const blockingWalletError = walletError && !wrongNetwork;

  const walletStatus: WalletStatus = blockingWalletError
    ? "error"
    : adapterTransitioning
      ? "connecting"
      : wrongNetwork
        ? "wrong_network"
        : hasConnectedAccount
          ? "connected"
          : "disconnected";

  const walletDisplayState: WalletDisplayState = blockingWalletError
    ? "error"
    : wrongNetwork
      ? "wrong_network"
      : hasConnectedAccount
        ? "connected"
        : adapterTransitioning
        ? (lastResolvedWalletAddressRef.current ? "switching" : "connecting")
        : "disconnected";

  useEffect(() => {
    if (walletAddress) {
      lastResolvedWalletAddressRef.current = walletAddress;
      return;
    }

    if (!connected && !isLoading && !connectingWalletName) {
      lastResolvedWalletAddressRef.current = null;
    }
  }, [connected, connectingWalletName, isLoading, walletAddress]);

  useEffect(() => {
    let cancelled = false;

    async function loadWalletBalance() {
      if (!connected || !walletAddress || wrongNetwork) {
        setWalletBalance(null);
        setWalletBalanceStatus("idle");
        setWalletBalanceError(null);
        return;
      }

      setWalletBalanceStatus("loading");
      setWalletBalanceError(null);

      try {
        const nextBalance = await getWalletAptBalance(walletAddress);
        if (cancelled) return;
        setWalletBalance(nextBalance);
        setWalletBalanceStatus("ready");
      } catch (error) {
        if (cancelled) return;
        console.error("[Wallet balance read failed]", error);
        setWalletBalanceStatus("error");
        setWalletBalanceError(error instanceof Error ? error.message : "Wallet balance unavailable.");
      }
    }

    loadWalletBalance();

    return () => {
      cancelled = true;
    };
  }, [connected, walletAddress, wrongNetwork]);

  const value = useMemo<WalletContextValue>(
    () => ({
      walletStatus,
      walletDisplayState,
      walletAddress,
      walletName: wallet?.name ?? null,
      networkName,
      providerReady,
      walletBalance,
      walletBalanceStatus,
      walletBalanceError,
      availableWallets: wallets,
      notDetectedWallets,
      connectingWalletName,
      switchNetworkPending,
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
      },
      switchWalletNetwork: async () => {
        if (switchNetworkPending) return;

        setWalletError(null);
        setSwitchNetworkPending(true);
        try {
          await Promise.resolve(changeNetwork(Network.TESTNET));
        } catch (error) {
          setWalletError(error instanceof Error ? error.message : "Wallet network switch failed.");
          throw error;
        } finally {
          setSwitchNetworkPending(false);
        }
      },
      signAndSubmitTransaction: async (transaction: InputTransactionData) => {
        setWalletError(null);
        const result = await signAndSubmitTransaction(transaction);
        return result.hash;
      }
    }),
    [
      connect,
      changeNetwork,
      connectingWalletName,
      disconnect,
      networkName,
      notDetectedWallets,
      providerReady,
      signAndSubmitTransaction,
      switchNetworkPending,
      walletBalance,
      walletBalanceError,
      walletBalanceStatus,
      walletDisplayState,
      wallet,
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
