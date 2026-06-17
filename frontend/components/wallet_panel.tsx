"use client";

import { useState } from "react";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { ActionButton } from "./action_button";
import { ModalShell } from "./modal_shell";

const wallet_status_copy = {
  disconnected: "Disconnected",
  connecting: "Connecting",
  connected: "Connected",
  wrong_network: "Wrong network",
  error: "Error"
} as const;

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletPanel() {
  const { balance, chainRead } = usePalate();
  const {
    availableWallets,
    connectWallet,
    connectingWalletName,
    disconnectWallet,
    networkName,
    notDetectedWallets,
    walletAddress,
    walletBalance,
    walletBalanceError,
    walletBalanceStatus,
    walletError,
    walletName,
    walletStatus
  } = usePalateWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const connected = walletStatus === "connected";
  const statusCopy = connected ? "Connected" : wallet_status_copy[walletStatus];
  const addressCopy = walletAddress ? shortenAddress(walletAddress) : statusCopy;
  const chainStatusCopy = chainRead.status === "ready" ? "Ready" : chainRead.status === "loading" ? "Loading" : chainRead.status === "error" ? "Error" : "Idle";
  const walletBalanceCopy = walletBalanceStatus === "ready"
    ? walletBalance ?? "Unavailable"
    : walletBalanceStatus === "loading"
      ? "Loading"
      : walletBalanceStatus === "error"
        ? "Unavailable"
        : "Disconnected";
  const palateBalanceCopy = connected ? balance.availableBalance : "Disconnected";

  async function handleConnect(nextWalletName: string) {
    await connectWallet(nextWalletName);
    setWalletModalOpen(false);
  }

  return (
    <>
      <aside className="wallet_panel">
        <div className="wallet_panel_header">
          <div className="wallet_identity">
            <span className="eyebrow">Wallet</span>
          </div>
          <span className={`wallet_status wallet_status_${walletStatus}`}>{statusCopy}</span>
        </div>
        <div className="wallet_compact_body">
          <strong>{connected ? addressCopy : statusCopy}</strong>
          <span>Wallet Balance {walletBalanceCopy}</span>
          <span>Palate Balance {palateBalanceCopy}</span>
        </div>
        {connected ? (
          <div className="wallet_meta">
            <span>{walletName ?? "Wallet"}</span>
            <span>{networkName ?? "Network unavailable"}</span>
          </div>
        ) : null}
        {walletStatus === "wrong_network" ? (
          <p className="wallet_message">Switch to Aptos Testnet before future on-chain actions.</p>
        ) : null}
        {walletError ? <p className="wallet_message wallet_message_error">{walletError}</p> : null}
        {walletBalanceError && connected ? <p className="wallet_message wallet_message_error">Wallet balance unavailable.</p> : null}
        <div className="chain_status_panel">
          <div className="wallet_panel_header">
            <span className="chain_status_network">{chainRead.networkLabel}</span>
            <span className={`chain_status_pill chain_status_${chainRead.status}`}>{chainStatusCopy}</span>
          </div>
          <div className="chain_status_rows">
            <span>Module {shortenAddress(chainRead.moduleAddress)}</span>
            {chainRead.treasuryAddress ? <span>Treasury {shortenAddress(chainRead.treasuryAddress)}</span> : null}
            {chainRead.warning ? <span className="chain_status_error">{chainRead.warning}</span> : null}
            {chainRead.error ? <span className="chain_status_error">{chainRead.error}</span> : null}
          </div>
        </div>
        <div className="wallet_actions">
          {connected ? (
            <ActionButton className="wallet_compact_button" onClick={disconnectWallet} variant="secondary">Disconnect</ActionButton>
          ) : (
            <ActionButton className="wallet_compact_button" disabled={walletStatus === "connecting"} onClick={() => setWalletModalOpen(true)}>
              {walletStatus === "connecting" ? "Connecting" : "Connect"}
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
                  disabled={walletStatus === "connecting"}
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
