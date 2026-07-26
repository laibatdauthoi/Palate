"use client";

import {
  AptosWalletAdapterProvider,
  useWallet,
  type AdapterNotDetectedWallet,
  type AdapterWallet
} from "@aptos-labs/wallet-adapter-react";
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-core";
import { Network } from "@aptos-labs/ts-sdk";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getShelbyTokenMetadata, getShelbyTokenWalletBalance, getWalletAptBalance, type ShelbyTokenMetadata, type ShelbyTokenWalletBalance } from "@/services/aptos_service";
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
  shelbyTokenTicker: string | null;
  shelbyTokenTickerStatus: "idle" | "loading" | "ready" | "error";
  shelbyTokenBalance: ShelbyTokenWalletBalance | null;
  shelbyTokenBalanceStatus: "idle" | "loading" | "ready" | "error";
  shelbyTokenBalanceError: string | null;
  availableWallets: ReadonlyArray<AdapterWallet>;
  notDetectedWallets: ReadonlyArray<AdapterNotDetectedWallet>;
  connectingWalletName: string | null;
  switchNetworkPending: boolean;
  walletError: string | null;
  connectWallet: (walletName: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  refreshWalletAssets: () => Promise<void>;
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
  const [shelbyTokenMetadata, setShelbyTokenMetadata] = useState<ShelbyTokenMetadata | null>(null);
  const [shelbyTokenTickerStatus, setShelbyTokenTickerStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shelbyTokenBalance, setShelbyTokenBalance] = useState<ShelbyTokenWalletBalance | null>(null);
  const [shelbyTokenBalanceStatus, setShelbyTokenBalanceStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shelbyTokenBalanceError, setShelbyTokenBalanceError] = useState<string | null>(null);
  const lastResolvedWalletAddressRef = useRef<string | null>(null);
  const walletAssetReadIdRef = useRef(0);

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

    async function loadShelbyTokenMetadata() {
      setShelbyTokenTickerStatus("loading");

      try {
        const nextMetadata = await getShelbyTokenMetadata();
        if (cancelled) return;
        setShelbyTokenMetadata(nextMetadata);
        setShelbyTokenTickerStatus("ready");
      } catch (error) {
        if (cancelled) return;
        console.error("[Shelby token metadata read failed]", error);
        setShelbyTokenMetadata(null);
        setShelbyTokenTickerStatus("error");
      }
    }

    loadShelbyTokenMetadata();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshWalletAssets = useCallback(async () => {
    const readId = walletAssetReadIdRef.current + 1;
    walletAssetReadIdRef.current = readId;

    if (!connected || !walletAddress || wrongNetwork) {
      setWalletBalance(null);
      setWalletBalanceStatus("idle");
      setWalletBalanceError(null);
      setShelbyTokenBalance(null);
      setShelbyTokenBalanceStatus("idle");
      setShelbyTokenBalanceError(null);
      return;
    }

    const ownerAddress = walletAddress;
    setWalletBalanceStatus("loading");
    setWalletBalanceError(null);
    setShelbyTokenBalanceStatus("loading");
    setShelbyTokenBalanceError(null);

    const metadataRead = (async () => {
      if (shelbyTokenMetadata) return shelbyTokenMetadata;

      setShelbyTokenTickerStatus("loading");
      return getShelbyTokenMetadata();
    })();

    const shelbyBalanceRead = metadataRead.then((tokenMetadata) =>
      getShelbyTokenWalletBalance(ownerAddress, tokenMetadata)
    );

    const [nextWalletBalance, nextShelbyMetadata, nextShelbyTokenBalance] = await Promise.allSettled([
      getWalletAptBalance(ownerAddress),
      metadataRead,
      shelbyBalanceRead
    ]);

    if (walletAssetReadIdRef.current !== readId) return;

    if (nextWalletBalance.status === "fulfilled") {
      setWalletBalance(nextWalletBalance.value);
      setWalletBalanceStatus("ready");
    } else {
      console.error("[Wallet balance read failed]", nextWalletBalance.reason);
      setWalletBalanceStatus("error");
      setWalletBalanceError(nextWalletBalance.reason instanceof Error ? nextWalletBalance.reason.message : "Wallet balance unavailable.");
    }

    if (nextShelbyMetadata.status === "fulfilled") {
      setShelbyTokenMetadata(nextShelbyMetadata.value);
      setShelbyTokenTickerStatus("ready");
    } else {
      console.error("[Shelby token metadata read failed]", nextShelbyMetadata.reason);
      setShelbyTokenMetadata(null);
      setShelbyTokenTickerStatus("error");
    }

    if (nextShelbyTokenBalance.status === "fulfilled") {
      setShelbyTokenBalance(nextShelbyTokenBalance.value);
      setShelbyTokenBalanceStatus("ready");
    } else {
      console.error("[Shelby token balance read failed]", nextShelbyTokenBalance.reason);
      setShelbyTokenBalance(null);
      setShelbyTokenBalanceStatus("error");
      setShelbyTokenBalanceError(nextShelbyTokenBalance.reason instanceof Error ? nextShelbyTokenBalance.reason.message : "Shelby token balance unavailable.");
    }
  }, [connected, shelbyTokenMetadata, walletAddress, wrongNetwork]);

  useEffect(() => {
    void refreshWalletAssets();
  }, [refreshWalletAssets]);

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
      shelbyTokenTicker: shelbyTokenMetadata?.ticker ?? null,
      shelbyTokenTickerStatus,
      shelbyTokenBalance,
      shelbyTokenBalanceStatus,
      shelbyTokenBalanceError,
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
      refreshWalletAssets,
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
      refreshWalletAssets,
      signAndSubmitTransaction,
      shelbyTokenMetadata,
      shelbyTokenBalance,
      shelbyTokenBalanceError,
      shelbyTokenBalanceStatus,
      shelbyTokenTickerStatus,
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
