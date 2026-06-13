"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { mock_balance, mock_claims, mock_matches, mock_media, mock_summary, mock_waiting_pushes } from "@/data/mock_data";
import type { ActiveMatch, BuffAssignment, ClaimRecord, MediaRecord, PalateBalance, UserSummary, WaitingPush, WalletStatus } from "@/types/palate";

type PalateContextValue = {
  walletStatus: WalletStatus;
  setWalletStatus: (status: WalletStatus) => void;
  mockWalletAddress: string;
  balance: PalateBalance;
  mediaRecords: MediaRecord[];
  waitingPushes: WaitingPush[];
  activeMatches: ActiveMatch[];
  currentAssignment: BuffAssignment | null;
  claimRecords: ClaimRecord[];
  userSummary: UserSummary;
  connectMockWallet: () => void;
  disconnectMockWallet: () => void;
  simulateWrongNetwork: () => void;
  simulateWalletError: () => void;
};

const PalateContext = createContext<PalateContextValue | null>(null);

export function PalateProvider({ children }: { children: ReactNode }) {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>("connected");

  const currentAssignment = useMemo<BuffAssignment>(
    () => ({
      match: mock_matches[0],
      assignedAt: "Just now",
      commitmentAmount: "0.500 APT",
      skipPenaltyAmount: mock_summary.skipPenalty
    }),
    []
  );

  const value = useMemo<PalateContextValue>(
    () => ({
      walletStatus,
      setWalletStatus,
      mockWalletAddress: mock_summary.walletAddress,
      balance: mock_balance,
      mediaRecords: mock_media,
      waitingPushes: mock_waiting_pushes,
      activeMatches: mock_matches,
      currentAssignment,
      claimRecords: mock_claims,
      userSummary: mock_summary,
      connectMockWallet: () => {
        setWalletStatus("connecting");
        window.setTimeout(() => setWalletStatus("connected"), 420);
      },
      disconnectMockWallet: () => setWalletStatus("disconnected"),
      simulateWrongNetwork: () => setWalletStatus("wrong_network"),
      simulateWalletError: () => setWalletStatus("error")
    }),
    [currentAssignment, walletStatus]
  );

  return <PalateContext.Provider value={value}>{children}</PalateContext.Provider>;
}

export function usePalate() {
  const context = useContext(PalateContext);

  if (!context) {
    throw new Error("usePalate must be used inside PalateProvider");
  }

  return context;
}
