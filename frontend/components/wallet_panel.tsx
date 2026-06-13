"use client";

import { app_config } from "@/config/app_config";
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
    disconnectMockWallet,
    simulateWalletError,
    simulateWrongNetwork
  } = usePalate();

  return (
    <aside className="wallet_panel">
      <div className="wallet_panel_header">
        <div>
          <span className="eyebrow">Wallet</span>
          <strong>{walletStatus === "connected" ? mockWalletAddress : wallet_status_copy[walletStatus]}</strong>
        </div>
        <span className={`wallet_status wallet_status_${walletStatus}`}>{app_config.mockMode ? "Mock" : app_config.networkLabel}</span>
      </div>
      <div className="wallet_balance">
        <span>Palate Balance</span>
        <strong>{walletStatus === "connected" ? balance.availableBalance : "--"}</strong>
      </div>
      <div className="wallet_actions">
        {walletStatus === "connected" ? (
          <ActionButton onClick={disconnectMockWallet} variant="secondary">Disconnect</ActionButton>
        ) : (
          <ActionButton disabled={walletStatus === "connecting"} onClick={connectMockWallet}>
            {walletStatus === "connecting" ? "Connecting" : "Connect Mock"}
          </ActionButton>
        )}
        <ActionButton onClick={simulateWrongNetwork} variant="ghost">Wrong Network</ActionButton>
        <ActionButton onClick={simulateWalletError} variant="ghost">Error</ActionButton>
      </div>
      <p className="mock_note">Future wallet adapter connection belongs here. No real transaction is submitted in this shell.</p>
    </aside>
  );
}
