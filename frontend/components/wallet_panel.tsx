"use client";

import { usePalate } from "@/providers/palate_provider";
import { ActionButton } from "./action_button";

const wallet_status_copy = {
  disconnected: "Disconnected",
  connecting: "Connecting",
  connected: "Connected",
  wrong_network: "Wrong network",
  error: "Error"
} as const;

export function WalletPanel() {
  const {
    walletStatus,
    mockWalletAddress,
    balance,
    connectMockWallet,
    disconnectMockWallet
  } = usePalate();
  const connected = walletStatus === "connected";

  return (
    <aside className="wallet_panel">
      <div className="wallet_panel_header">
        <div>
          <span className="eyebrow">Wallet</span>
          <strong>{connected ? mockWalletAddress : wallet_status_copy[walletStatus]}</strong>
        </div>
        <span className={`wallet_status wallet_status_${walletStatus}`}>{connected ? "Connected" : wallet_status_copy[walletStatus]}</span>
      </div>
      <div className="wallet_balance">
        <span>Palate Balance</span>
        <strong>{connected ? balance.availableBalance : "--"}</strong>
      </div>
      <div className="wallet_actions">
        {connected ? (
          <ActionButton onClick={disconnectMockWallet} variant="secondary">Disconnect</ActionButton>
        ) : (
          <ActionButton disabled={walletStatus === "connecting"} onClick={connectMockWallet}>
            {walletStatus === "connecting" ? "Connecting" : "Connect"}
          </ActionButton>
        )}
      </div>
    </aside>
  );
}
