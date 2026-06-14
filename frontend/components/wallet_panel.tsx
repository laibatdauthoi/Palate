"use client";

import { useState } from "react";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { ActionButton } from "./action_button";

const wallet_status_copy = {
  disconnected: "Disconnected",
  connecting: "Connecting",
  connected: "Connected",
  wrong_network: "Wrong network",
  error: "Error"
} as const;

export function WalletPanel() {
  const { balance } = usePalate();
  const {
    availableWallets,
    connectWallet,
    connectingWalletName,
    disconnectWallet,
    networkName,
    notDetectedWallets,
    walletAddress,
    walletError,
    walletName,
    walletStatus
  } = usePalateWallet();
  const [showWalletChoices, setShowWalletChoices] = useState(false);
  const connected = walletStatus === "connected";
  const statusCopy = connected ? "Connected" : wallet_status_copy[walletStatus];
  const addressCopy = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : statusCopy;

  async function handleConnect(wallet: string) {
    await connectWallet(wallet);
    setShowWalletChoices(false);
  }

  return (
    <aside className="wallet_panel">
      <div className="wallet_panel_header">
        <div>
          <span className="eyebrow">Wallet</span>
          <strong>{connected ? addressCopy : statusCopy}</strong>
        </div>
        <span className={`wallet_status wallet_status_${walletStatus}`}>{statusCopy}</span>
      </div>
      <div className="wallet_balance">
        <span>Palate Balance</span>
        <strong>{balance.availableBalance}</strong>
      </div>
      {connected ? (
        <div className="wallet_meta">
          <span>{walletName ?? "Wallet"}</span>
          <span>{networkName ? `Network: ${networkName}` : "Network unavailable"}</span>
        </div>
      ) : null}
      {walletStatus === "wrong_network" ? (
        <p className="wallet_message">Switch to Aptos Testnet before future on-chain actions.</p>
      ) : null}
      {walletError ? <p className="wallet_message wallet_message_error">{walletError}</p> : null}
      <div className="wallet_actions">
        {connected ? (
          <ActionButton onClick={disconnectWallet} variant="secondary">Disconnect</ActionButton>
        ) : (
          <ActionButton disabled={walletStatus === "connecting"} onClick={() => setShowWalletChoices((current) => !current)}>
            {walletStatus === "connecting" ? "Connecting" : "Connect"}
          </ActionButton>
        )}
      </div>
      {!connected && showWalletChoices ? (
        <div className="wallet_choice_list">
          {availableWallets.length > 0 ? (
            availableWallets.map((wallet) => (
              <button
                className="wallet_choice"
                disabled={walletStatus === "connecting"}
                key={wallet.name}
                onClick={() => handleConnect(wallet.name)}
                type="button"
              >
                <span>{wallet.name}</span>
                {connectingWalletName === wallet.name ? <small>Connecting</small> : null}
              </button>
            ))
          ) : (
            <p className="wallet_message">No browser wallet detected.</p>
          )}
          {notDetectedWallets.length > 0 ? (
            <div className="wallet_not_detected">
              {notDetectedWallets.slice(0, 3).map((wallet) => (
                <span key={wallet.name}>{wallet.name}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
