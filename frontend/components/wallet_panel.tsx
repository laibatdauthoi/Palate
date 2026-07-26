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
  rejected: "Rejected",
  error: "Error"
} as const;

const wallet_asset_value_max_length = 12;
const wallet_asset_value_prefix_length = 5;
const wallet_asset_value_suffix_length = 4;

function shortenAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function middleTruncateAssetValue(value: string) {
  if (value.length <= wallet_asset_value_max_length) {
    return value;
  }

  const decimalIndex = value.indexOf(".");
  if (decimalIndex > wallet_asset_value_prefix_length) {
    return value.slice(0, decimalIndex);
  }

  return `${value.slice(0, wallet_asset_value_prefix_length)}...${value.slice(-wallet_asset_value_suffix_length)}`;
}

function normalizeShelbyTickerLabel(ticker: string) {
  return /^shelby[_-]usd$/i.test(ticker) ? "SHELBY" : ticker;
}

function normalizeExactBalanceText(value: string) {
  const trimmedValue = value.trim();
  const numericMatch = /^([+-]?\d[\d,]*)(?:\.(\d+))?$/.exec(trimmedValue);

  if (!numericMatch) {
    return trimmedValue;
  }

  const [, whole, fractional = ""] = numericMatch;
  const trimmedFractional = fractional.replace(/0+$/, "");

  return trimmedFractional ? `${whole}.${trimmedFractional}` : whole;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatExactAssetBalance(value: string, unit?: string) {
  const unitPattern = unit ? new RegExp(`\\s*${escapeRegExp(unit)}\\s*$`, "i") : null;
  const unitlessValue = unitPattern ? value.replace(unitPattern, "") : value;
  const fullValue = normalizeExactBalanceText(unitlessValue);

  return {
    display: fullValue,
    title: unit ? `${fullValue} ${unit}` : fullValue
  };
}

type WalletAssetBalanceDisplay = ReturnType<typeof formatExactAssetBalance>;
type WalletAssetRowStatus = "ready" | "loading" | "warning";

type WalletAssetRow = {
  key: "apt" | "shelby" | "deposited";
  label: string;
  labelTitle?: string;
  status: WalletAssetRowStatus;
  statusTitle: string;
  unit?: string;
  value: WalletAssetBalanceDisplay | null;
};

function getAssetRowStatus(
  value: WalletAssetBalanceDisplay | null,
  readStatus: "idle" | "loading" | "refreshing" | "ready" | "error",
  connectedOnTargetNetwork: boolean
): WalletAssetRowStatus {
  if (value) return "ready";
  if (!connectedOnTargetNetwork || readStatus === "error") return "warning";
  return "loading";
}

export function WalletPanel() {
  const { balance, chainRead, palateBalanceReadStatus } = usePalate();
  const {
    availableWallets,
    clearWalletError,
    connectWallet,
    connectingWalletName,
    disconnectWallet,
    networkName,
    notDetectedWallets,
    switchNetworkPending,
    switchWalletNetwork,
    shelbyTokenTicker,
    shelbyTokenTickerStatus,
    shelbyTokenBalance,
    shelbyTokenBalanceStatus,
    walletBalance,
    walletBalanceStatus,
    walletAddress,
    walletDisplayState,
    walletName,
    walletStatus
  } = usePalateWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const connected = walletDisplayState === "connected";
  const transitioning = walletDisplayState === "connecting" || walletDisplayState === "switching";
  const pending = transitioning || walletStatus === "connecting" || switchNetworkPending;
  const statusCopy = wallet_status_copy[walletDisplayState];
  const addressCopy = walletAddress ? shortenAddress(walletAddress) : statusCopy;
  const showWrongNetworkAction = walletStatus === "wrong_network";
  const connectedOnTargetNetwork = connected && !showWrongNetworkAction;
  const walletIssueTitle = walletDisplayState === "rejected"
    ? "Connection rejected"
    : walletDisplayState === "error"
      ? "Connection error"
      : walletDisplayState === "wrong_network"
        ? "Wrong network"
        : walletDisplayState === "connecting" || walletDisplayState === "switching"
          ? "Wallet connecting"
          : connectedOnTargetNetwork
            ? "Wallet connected"
            : "Wallet not connected";
  const chainStatusCopy = !connectedOnTargetNetwork
    ? walletIssueTitle
    : chainRead.warning
      ? "Using last read"
      : chainRead.status === "error"
        ? "Connection error"
        : "Wallet connected";
  const formattedAptBalance = connectedOnTargetNetwork && walletBalanceStatus === "ready" && walletBalance ? formatExactAssetBalance(walletBalance, "APT") : null;
  const formattedDepositedBalance = connectedOnTargetNetwork && palateBalanceReadStatus === "ready" ? formatExactAssetBalance(balance.availableBalance, "APT") : null;
  const formattedShelbyTokenBalance = connectedOnTargetNetwork && shelbyTokenBalanceStatus === "ready" && shelbyTokenBalance?.ticker
    ? {
        ...formatExactAssetBalance(shelbyTokenBalance.balance, shelbyTokenBalance.ticker),
        ticker: shelbyTokenBalance.ticker,
      }
    : null;
  const shelbyTickerLabel = shelbyTokenTickerStatus === "ready" && shelbyTokenTicker ? normalizeShelbyTickerLabel(shelbyTokenTicker) : "SHELBY";
  const walletAssetRows: WalletAssetRow[] = [
    {
      key: "apt",
      label: "APT",
      status: getAssetRowStatus(formattedAptBalance, walletBalanceStatus, connectedOnTargetNetwork),
      statusTitle: connectedOnTargetNetwork && walletBalanceStatus === "error" ? "APT balance unavailable" : walletIssueTitle,
      value: formattedAptBalance
    },
    {
      key: "shelby",
      label: shelbyTickerLabel,
      labelTitle: shelbyTokenTicker ?? undefined,
      status: getAssetRowStatus(formattedShelbyTokenBalance, shelbyTokenBalanceStatus, connectedOnTargetNetwork),
      statusTitle: connectedOnTargetNetwork && shelbyTokenBalanceStatus === "error" ? "SHELBY balance unavailable" : walletIssueTitle,
      value: formattedShelbyTokenBalance
    },
    {
      key: "deposited",
      label: "Deposited",
      status: getAssetRowStatus(formattedDepositedBalance, palateBalanceReadStatus, connectedOnTargetNetwork),
      statusTitle: connectedOnTargetNetwork && palateBalanceReadStatus === "error" ? "Deposited balance unavailable" : walletIssueTitle,
      unit: "APT",
      value: formattedDepositedBalance
    }
  ];
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
    if (!connectedOnTargetNetwork || chainRead.warning || chainRead.status === "error") {
      return <CircleAlert aria-hidden="true" className="chain_status_icon_svg chain_status_icon_svg_error" strokeWidth={2.2} />;
    }

    return <CircleCheckBig aria-hidden="true" className="chain_status_icon_svg chain_status_icon_svg_ready" strokeWidth={2.2} />;
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

    clearWalletError();
    setWalletModalOpen(true);
  }

  async function handleConnect(nextWalletName: string) {
    const connected = await connectWallet(nextWalletName);
    if (connected) {
      setWalletModalOpen(false);
    }
  }

  function renderAssetValue(row: WalletAssetRow) {
    if (row.status === "loading") {
      return (
        <span className="wallet_asset_value wallet_asset_value_loading" aria-label="Loading">
          <LoaderCircle aria-hidden="true" className="wallet_asset_loading_icon" strokeWidth={2.2} />
        </span>
      );
    }

    if (row.status === "warning" || !row.value) {
      return (
        <span className="wallet_asset_value wallet_asset_value_warning" aria-label={row.statusTitle} title={row.statusTitle}>
          <CircleAlert aria-hidden="true" className="wallet_asset_warning_icon" strokeWidth={2.2} />
        </span>
      );
    }

    const displayValue = middleTruncateAssetValue(row.value.display);
    const title = row.value.title;

    return (
      <span className="wallet_asset_value" aria-label={title ?? "Not ready"} title={title}>
        <span className="wallet_asset_number">{displayValue}</span>
        {row.unit ? <span className="wallet_asset_unit">{row.unit}</span> : null}
      </span>
    );
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
        <div className="wallet_compact_body wallet_compact_body_assets">
          <span className="wallet_address_line" title={walletAddress ?? undefined}>{addressCopy}</span>
          <span className="wallet_meta_line">
            <span className="wallet_network_label">
              {walletName ?? "Wallet"}
              {" \u00b7 "}
            </span>
            <span className="wallet_network_value">{networkName ?? "Network"}</span>
            <span className="chain_status_pill" aria-label={chainStatusCopy} title={chainStatusCopy}>
              {renderChainStatusIcon()}
            </span>
          </span>
          <div className="wallet_primary_value">
            <div className="wallet_asset_rows" aria-label="Wallet assets">
              {walletAssetRows.map((row) => (
                <div className="wallet_asset_row" key={row.key}>
                  <span className="wallet_asset_label" title={row.labelTitle}>{row.label}</span>
                  {renderAssetValue(row)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ModalShell open={walletModalOpen} onClose={() => setWalletModalOpen(false)} title="Connect wallet">
        <div className="wallet_modal_content">
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
