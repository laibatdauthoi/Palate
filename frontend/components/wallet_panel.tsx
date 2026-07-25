"use client";

import { useState } from "react";
import { CircleAlert, CircleCheckBig, LoaderCircle, Plug, Unplug } from "lucide-react";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
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
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatCompactNumber(value: number, maximumFractionDigits: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(value);
}

function formatCompactTokenAmount(value: number) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000_000) {
    return `${sign}${formatCompactNumber(absoluteValue / 1_000_000_000, 2)}B`;
  }

  if (absoluteValue >= 1_000_000) {
    return `${sign}${formatCompactNumber(absoluteValue / 1_000_000, 2)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${sign}${formatCompactNumber(absoluteValue / 1_000, 2)}K`;
  }

  if (absoluteValue >= 1) {
    return `${sign}${formatCompactNumber(absoluteValue, 2)}`;
  }

  if (absoluteValue === 0) {
    return "0";
  }

  return `${sign}${formatCompactNumber(absoluteValue, absoluteValue >= 0.001 ? 4 : 6)}`;
}

function formatWalletBalance(value: string) {
  const unitlessValue = value.replace(/\s*APT\s*$/i, "").trim();
  const numericValue = Number(unitlessValue.replace(/,/g, ""));

  if (!Number.isFinite(numericValue)) {
    return {
      display: unitlessValue || value,
      title: unitlessValue ? `${unitlessValue} APT` : undefined
    };
  }

  return {
    display: formatCompactTokenAmount(numericValue),
    title: `${unitlessValue || formatCompactTokenAmount(numericValue)} APT`
  };
}

function getChainStatusCopy(status: "idle" | "loading" | "ready" | "error", warning: string | null) {
  if (warning) return "Using last read";
  if (status === "ready") return "Ready";
  if (status === "loading") return "Loading";
  if (status === "error") return "Unavailable";
  return "Idle";
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
    switchNetworkPending,
    switchWalletNetwork,
    walletAddress,
    walletDisplayState,
    walletError,
    walletName,
    walletStatus
  } = usePalateWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const connected = walletDisplayState === "connected";
  const hasWalletAccount = Boolean(walletAddress) && (walletDisplayState === "connected" || walletDisplayState === "wrong_network");
  const transitioning = walletDisplayState === "connecting" || walletDisplayState === "switching";
  const pending = transitioning || walletStatus === "connecting" || switchNetworkPending;
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
  const showWrongNetworkAction = walletStatus === "wrong_network";
  const formattedPalateBalance = connected && !showWrongNetworkAction && palateBalanceReadStatus === "ready" ? formatWalletBalance(balance.availableBalance) : null;
  const palateBalanceCopy = formattedPalateBalance
    ? formattedPalateBalance.display
    : hasWalletAccount
      ? palateBalanceReadStatus === "loading" || palateBalanceReadStatus === "refreshing"
        ? "Syncing..."
        : palateBalanceReadStatus === "error"
          ? "Unavailable"
          : walletDisplayState === "wrong_network"
            ? "Wrong network"
            : "Syncing..."
      : transitioning
        ? "Syncing..."
        : "Disconnected";
  const showBalanceUnit = Boolean(formattedPalateBalance);
  const walletControlLabel = pending
    ? switchNetworkPending
      ? "Switching wallet network"
      : walletDisplayState === "switching"
      ? "Switching wallet"
      : "Connecting wallet"
    : showWrongNetworkAction
      ? "Switch wallet network to Aptos Testnet"
      : connected
        ? "Disconnect wallet"
        : "Connect wallet";

  function renderChainStatusIcon() {
    if (walletStatus === "wrong_network" || chainRead.warning || chainRead.status === "error") {
      return <CircleAlert aria-hidden="true" className="chain_status_icon_svg chain_status_icon_svg_error" strokeWidth={2.2} />;
    }

    if (chainRead.status === "ready") {
      return <CircleCheckBig aria-hidden="true" className="chain_status_icon_svg chain_status_icon_svg_ready" strokeWidth={2.2} />;
    }

    return null;
  }

  function renderWalletControlIcon() {
    if (pending) {
      return <LoaderCircle aria-hidden="true" className="wallet_control_icon wallet_control_icon_loading" strokeWidth={2.2} />;
    }

    if (connected || showWrongNetworkAction) {
      return <Unplug aria-hidden="true" className="wallet_control_icon" strokeWidth={2.2} />;
    }

    return <Plug aria-hidden="true" className="wallet_control_icon" strokeWidth={2.2} />;
  }

  async function handleWalletControlClick() {
    if (pending) return;

    if (showWrongNetworkAction) {
      await switchWalletNetwork();
      return;
    }

    if (connected) {
      await disconnectWallet();
      return;
    }

    setWalletModalOpen(true);
  }

  async function handleConnect(nextWalletName: string) {
    await connectWallet(nextWalletName);
    setWalletModalOpen(false);
  }

  return (
    <>
      <section className="wallet_object wallet_panel" aria-label="Wallet">
        <div className="wallet_identity_controls">
          <div className="wallet_avatar_placeholder" aria-hidden="true" />
          <button
            aria-label={walletControlLabel}
            className="wallet_control_button"
            disabled={pending}
            onClick={handleWalletControlClick}
            type="button"
          >
            {renderWalletControlIcon()}
          </button>
        </div>
        <div className="wallet_compact_body">
            {hasWalletAccount ? (
              <>
                <span className="wallet_address_line" title={walletAddress ?? undefined}>{addressCopy}</span>
                <span className="wallet_meta_line">
                  <span className="wallet_network_label">
                    {walletName ?? "Wallet"}
                    {" \u00b7 "}
                  </span>
                  <span className="wallet_network_value">{networkName ?? "Network"}</span>
                  <span className="chain_status_pill" aria-label={chainStatusCopy}>
                    {renderChainStatusIcon()}
                  </span>
                </span>
                <div className="wallet_primary_value">
                  {showWrongNetworkAction ? (
                    <span className="wallet_state_message">Wrong network</span>
                  ) : (
                    <strong className="wallet_balance_primary" title={formattedPalateBalance?.title}>
                      <span className="wallet_balance_value">{palateBalanceCopy}</span>
                      {showBalanceUnit ? <span className="wallet_balance_unit">APT</span> : null}
                    </strong>
                  )}
                </div>
              </>
            ) : (
              <strong className="wallet_balance_primary wallet_balance_primary_status">{walletPrimaryCopy}</strong>
            )}
        </div>
      </section>

      <ModalShell open={walletModalOpen} onClose={() => setWalletModalOpen(false)} title="Connect wallet">
        <div className="wallet_modal_content">
          {walletError ? <p className="wallet_message wallet_message_error">{walletError}</p> : null}
          {availableWallets.length > 0 ? (
            <div className="wallet_modal_grid">
              {availableWallets.map((wallet) => (
                <button
                  className="wallet_option_card"
                  disabled={pending}
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
