"use client";

import { useState } from "react";
import { CircleAlert, CircleCheckBig, LoaderCircle, Plug, PlugZap, Unplug, Wallet } from "lucide-react";
import { app_config } from "@/config/app_config";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { ActionButton } from "./action_button";
import { ModalShell } from "./modal_shell";

const wallet_status_copy = {
  disconnected: "Disconnected",
  connecting: "Connecting",
  switching: "Switching",
  connected: "Connected",
  wrong_network: "Wrong network",
  error: "Error"
} as const;

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatCompactBalance(value: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  const maximumFractionDigits = numericValue >= 1000 ? 1 : numericValue >= 1 ? 2 : 4;

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(numericValue);
}

function getChainStatusCopy(status: "idle" | "loading" | "ready" | "error", warning: string | null) {
  if (warning) return "Using last read";
  if (status === "ready") return "Ready";
  if (status === "loading") return "Loading";
  if (status === "error") return "Unavailable";
  return "Idle";
}

function WalletDisplayIcon({ walletDisplayState }: { walletDisplayState: keyof typeof wallet_status_copy }) {
  switch (walletDisplayState) {
    case "connected":
      return <PlugZap className="wallet_status_icon_svg wallet_status_icon_svg_connected" strokeWidth={2.25} />;
    case "connecting":
    case "switching":
      return <LoaderCircle className="wallet_status_icon_svg wallet_status_icon_svg_loading" strokeWidth={2.25} />;
    case "wrong_network":
      return <CircleAlert className="wallet_status_icon_svg wallet_status_icon_svg_warning" strokeWidth={2.25} />;
    case "error":
      return <CircleAlert className="wallet_status_icon_svg wallet_status_icon_svg_error" strokeWidth={2.25} />;
    case "disconnected":
    default:
      return <Unplug className="wallet_status_icon_svg wallet_status_icon_svg_idle" strokeWidth={2.25} />;
  }
}

function ChainStatusIcon({
  connected,
  status,
  warning
}: {
  connected: boolean;
  status: "idle" | "loading" | "ready" | "error";
  warning: string | null;
}) {
  if (!connected) {
    return <Wallet className="chain_status_icon_svg chain_status_icon_svg_idle" strokeWidth={2.2} />;
  }

  if (warning || status === "error") {
    return <CircleAlert className="chain_status_icon_svg chain_status_icon_svg_error" strokeWidth={2.2} />;
  }

  if (status === "loading") {
    return <LoaderCircle className="chain_status_icon_svg chain_status_icon_svg_loading" strokeWidth={2.2} />;
  }

  if (status === "ready") {
    return <CircleCheckBig className="chain_status_icon_svg chain_status_icon_svg_ready" strokeWidth={2.2} />;
  }

  return <Wallet className="chain_status_icon_svg chain_status_icon_svg_idle" strokeWidth={2.2} />;
}

export function WalletPanel() {
  const { balance, chainRead, palateBalanceReadStatus } = usePalate();
  const {
    availableWallets,
    connectWallet,
    connectingWalletName,
    disconnectWallet,
    networkName,
    notDetectedWallets,
    providerReady,
    walletAddress,
    walletBalance,
    walletBalanceError,
    walletBalanceStatus,
    walletDisplayState,
    walletError,
    walletName,
    walletStatus
  } = usePalateWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const connected = walletDisplayState === "connected";
  const transitioning = walletDisplayState === "connecting" || walletDisplayState === "switching";
  const showWalletEnvironment = walletDisplayState === "connected" || walletDisplayState === "error";
  const statusCopy = wallet_status_copy[walletDisplayState];
  const addressCopy = walletAddress ? shortenAddress(walletAddress) : statusCopy;
  const chainStatusCopy = getChainStatusCopy(chainRead.status, chainRead.warning);
  const walletPrimaryCopy = connected
    ? addressCopy
    : walletDisplayState === "switching"
      ? "Switching wallet..."
      : walletDisplayState === "connecting"
        ? "Connecting..."
        : statusCopy;
  const walletBalanceCopy = connected
    ? walletBalanceStatus === "ready"
      ? walletBalance
        ? formatCompactBalance(walletBalance)
        : "Unavailable"
      : walletBalanceStatus === "loading"
        ? "Loading"
        : walletBalanceStatus === "error"
          ? "Unavailable"
          : "Loading"
    : transitioning
      ? "Syncing..."
      : "Disconnected";
  const palateBalanceCopy = connected
    ? palateBalanceReadStatus === "ready"
      ? formatCompactBalance(balance.availableBalance)
      : palateBalanceReadStatus === "loading" || palateBalanceReadStatus === "refreshing"
        ? "Syncing..."
        : palateBalanceReadStatus === "error"
          ? "Unavailable"
          : "Syncing..."
    : transitioning
      ? "Syncing..."
      : "Disconnected";
  const showDetailsToggle = Boolean(chainRead.warning || chainRead.error || app_config.debugAptosReads);
  const compactStatusLine = chainRead.error
    ? "Contract read temporarily unavailable"
    : walletStatus === "wrong_network"
      ? "Switch to Aptos Testnet!"
      : walletError
        ? walletError
        : walletBalanceError && connected
          ? "Wallet balance unavailable."
          : walletDisplayState === "switching"
            ? "Waiting for the new wallet account to resolve."
            : walletDisplayState === "connecting"
              ? "Waiting for connection..."
              : null;
  const chainPillTone = walletStatus === "wrong_network"
    ? "error"
    : connected
      ? chainRead.status
      : walletDisplayState === "error"
        ? "error"
        : "idle";
  const chainPillCopy = walletStatus === "wrong_network"
    ? "Wrong network"
    : connected
      ? chainStatusCopy
      : "Unavailable";
  const showWrongNetworkAction = walletStatus === "wrong_network";

  async function handleConnect(nextWalletName: string) {
    await connectWallet(nextWalletName);
    setWalletModalOpen(false);
  }

  return (
    <>
      <aside className="wallet_panel">
        <div className="wallet_panel_header">
          <div className="wallet_identity">
            <span className="wallet_identity_header">
              <span aria-hidden="true" className={`wallet_status_icon wallet_status_icon_${walletDisplayState === "switching" ? "connecting" : walletDisplayState}`}>
                <WalletDisplayIcon walletDisplayState={walletDisplayState} />
              </span>
              <span className="eyebrow">Wallet</span>
            </span>
          </div>
        </div>
        <div className="wallet_compact_body">
          <strong>{walletPrimaryCopy}</strong>
          <span><strong>Wallet:</strong> {walletBalanceCopy}</span>
          <span><strong>Palate:</strong> {palateBalanceCopy}</span>
        </div>
        {showWalletEnvironment && (walletName || networkName || providerReady) ? (
          <div className="wallet_meta">
            <span className="wallet_meta_line">
              {walletName ?? "Wallet"}
              {" · "}
              {(networkName ?? "Network").toLowerCase()}
              {" · "}
              <span className={`chain_status_pill chain_status_${chainPillTone}`}>
                <ChainStatusIcon connected={connected} status={chainRead.status} warning={chainRead.warning} />
                {chainPillCopy}
              </span>
            </span>
          </div>
        ) : null}
        {compactStatusLine ? <p className={`wallet_message ${chainRead.error || walletStatus === "wrong_network" || walletError || walletBalanceError ? "wallet_message_error" : ""}`}>{compactStatusLine}</p> : null}
        {showDetailsToggle ? (
          <div className="wallet_details_section">
            <button
              type="button"
              className="wallet_details_toggle"
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? "Hide Details" : "Details"}
            </button>
            {detailsOpen ? (
              <div className="wallet_details_list">
                <span>{chainRead.networkLabel}</span>
                <span>Module {shortenAddress(chainRead.moduleAddress)}</span>
                {chainRead.treasuryAddress ? <span>Treasury {shortenAddress(chainRead.treasuryAddress)}</span> : null}
                {chainRead.warning ? <span className="chain_status_error">{chainRead.warning}</span> : null}
                {chainRead.error ? <span className="chain_status_error">{chainRead.error}</span> : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="wallet_actions">
          {connected ? (
            <ActionButton className="wallet_compact_button" onClick={disconnectWallet} variant="secondary">
              <span className="wallet_action_content">
                <Unplug aria-hidden="true" className="wallet_action_icon" strokeWidth={2.2} />
                <span className="wallet_action_label">Disconnect</span>
              </span>
            </ActionButton>
          ) : showWrongNetworkAction ? (
            <ActionButton className="wallet_compact_button wallet_compact_button_status" disabled variant="secondary">
              <span className="wallet_action_content">
                <CircleAlert aria-hidden="true" className="wallet_action_icon" strokeWidth={2.2} />
                <span className="wallet_action_label">Switch network</span>
              </span>
            </ActionButton>
          ) : (
            <ActionButton className="wallet_compact_button" disabled={transitioning || walletStatus === "connecting"} onClick={() => setWalletModalOpen(true)}>
              <span className="wallet_action_content">
                <Plug aria-hidden="true" className={`wallet_action_icon ${transitioning || walletStatus === "connecting" ? "wallet_action_icon_loading" : ""}`} strokeWidth={2.2} />
                <span className="wallet_action_label">{walletDisplayState === "switching" ? "Switching" : walletStatus === "connecting" ? "Connecting" : "Connect"}</span>
              </span>
            </ActionButton>
          )}
        </div>
      </aside>

      <ModalShell open={walletModalOpen} onClose={() => setWalletModalOpen(false)} title="Connect wallet">
        <div className="wallet_modal_content">
          {walletError ? <p className="wallet_message wallet_message_error">{walletError}</p> : null}
          {availableWallets.length > 0 ? (
            <div className="wallet_modal_grid">
              {availableWallets.map((wallet) => (
                <button
                  className="wallet_option_card"
                  disabled={transitioning || walletStatus === "connecting"}
                  key={wallet.name}
                  onClick={() => handleConnect(wallet.name)}
                  type="button"
                >
                  {wallet.icon ? <span aria-hidden="true" className="wallet_option_icon" style={{ backgroundImage: `url(${wallet.icon})` }} /> : null}
                  <span>{wallet.name}</span>
                  {connectingWalletName === wallet.name ? <small>Connecting</small> : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="wallet_modal_empty">No compatible wallet is available in this browser.</p>
          )}
          {notDetectedWallets.length > 0 ? (
            <div className="wallet_not_detected">
              {notDetectedWallets.slice(0, 6).map((wallet) => (
                <span key={wallet.name}>{wallet.name}</span>
              ))}
            </div>
          ) : null}
        </div>
      </ModalShell>
    </>
  );
}
