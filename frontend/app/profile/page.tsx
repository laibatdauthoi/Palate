"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/action_button";
import { AmountInput } from "@/components/amount_input";
import { EmptyState } from "@/components/empty_state";
import { ClaimCard } from "@/components/claim_card";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { formatOctasToApt } from "@/services/aptos_service";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="page_stack page_profile" />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const { balance, claimReadStatus, claimRecords, claimReward, depositBalance, feedback, processingAction, refreshClaims, userSummary, withdrawBalance } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"Stats" | "Claims">(searchParams.get("tab") === "Claims" ? "Claims" : "Stats");
  const [balanceAmount, setBalanceAmount] = useState("1.000");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTouched, setHistoryTouched] = useState(false);
  const balanceBusy = processingAction === "deposit" || processingAction === "withdraw";
  const walletReady = walletStatus === "connected" && Boolean(walletAddress);
  const claimBusy = processingAction === "claimReward";
  const profile_stats = [
    { label: "Push count", value: userSummary.pushCount },
    { label: "Push wins", value: userSummary.pushWins },
    { label: "Push losses", value: userSummary.pushLosses },
    { label: "Push win rate", value: userSummary.pushWinRate },
    { label: "Push profit", value: userSummary.pushProfit },
    { label: "Buff count", value: userSummary.buffCount },
    { label: "Buff wins", value: userSummary.buffWins },
    { label: "Buff losses", value: userSummary.buffLosses },
    { label: "Buff win rate", value: userSummary.buffWinRate },
    { label: "Buff profit", value: userSummary.buffProfit },
    { label: "Total pushed", value: userSummary.totalPushed },
    { label: "Total buffed", value: userSummary.totalBuffed }
  ];
  const claimableClaims = useMemo(
    () => claimRecords.filter((claim) => claim.settled && !claim.claimed && claim.claimable && BigInt(claim.claimableAmountOctas) > BigInt(0)),
    [claimRecords]
  );
  const claimedClaims = useMemo(() => claimRecords.filter((claim) => claim.claimed), [claimRecords]);
  const totalClaimableAmount = useMemo(
    () => formatOctasToApt(claimableClaims.reduce((total, claim) => total + BigInt(claim.claimableAmountOctas), BigInt(0))),
    [claimableClaims]
  );
  const claimReadMessage =
    claimReadStatus === "loading"
      ? "Loading claims."
      : claimReadStatus === "error"
        ? claimRecords.length > 0
          ? "Claims temporarily unavailable. Using last read."
          : "Claims temporarily unavailable."
        : null;

  useEffect(() => {
    if (tab !== "Claims" || !walletReady || claimReadStatus !== "idle") return;
    void refreshClaims();
  }, [claimReadStatus, refreshClaims, tab, walletReady]);

  useEffect(() => {
    if (searchParams.get("tab") === "Claims") {
      setTab("Claims");
    }
  }, [searchParams]);

  useEffect(() => {
    if (tab !== "Claims") {
      setHistoryTouched(false);
      return;
    }

    if (!historyTouched) {
      setHistoryOpen(claimableClaims.length === 0);
    }
  }, [claimableClaims.length, historyTouched, tab]);

  return (
    <div className="page_stack page_profile">
      <PageHeader
        eyebrow="Profile"
        title="Balance, stats, and Buff Rewards."
        copy="Claims credit Palate Balance first. Wallet withdrawal is a separate action after available balance updates."
      />

      <div className="profile_summary_grid">
        <SectionPanel>
          <div className="stat_card">
            <span>Wallet</span>
            <strong>{walletAddress ?? "Not connected"}</strong>
          </div>
        </SectionPanel>
        <SectionPanel accent>
          <div className="stat_card">
            <span>Palate Balance</span>
            <strong>{balance.availableBalance}</strong>
          </div>
        </SectionPanel>
        <SectionPanel>
          <div className="stat_card">
            <span>Claimable amount</span>
            <strong>{userSummary.claimableAmount}</strong>
          </div>
        </SectionPanel>
      </div>

      <SectionPanel title="Manage Palate Balance" copy="Deposit and withdraw available Palate Balance on Aptos Testnet.">
        <div className="profile_balance_controls">
          <AmountInput label="Amount" onChange={setBalanceAmount} placeholder="1.000 APT" value={balanceAmount} />
          <ActionButton disabled={balanceBusy || !walletReady} onClick={() => depositBalance(balanceAmount)} variant="secondary">
            {processingAction === "deposit" ? "Depositing" : "Deposit"}
          </ActionButton>
          <ActionButton disabled={balanceBusy || !walletReady} onClick={() => withdrawBalance(balanceAmount)} variant="secondary">
            {processingAction === "withdraw" ? "Withdrawing" : "Withdraw"}
          </ActionButton>
        </div>
        {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to manage Palate Balance.</p> : null}
        {feedback ? <p className={`feedback_text feedback_${feedback.type}`}>{feedback.message}</p> : null}
      </SectionPanel>

      <SectionPanel>
        <div className="tabs">
          {(["Stats", "Claims"] as const).map((item) => (
            <button
              className={`tab_button ${tab === item ? "active" : ""}`}
              key={item}
              onClick={() => {
                if (item === "Claims") {
                  setHistoryTouched(false);
                }
                setTab(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </SectionPanel>

      {tab === "Stats" ? (
        <div className="panel_grid">
          {profile_stats.map((stat) => (
            <SectionPanel key={stat.label}>
              <div className="stat_card">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            </SectionPanel>
          ))}
        </div>
      ) : (
        <div className="stack">
          <SectionPanel title="Claim Center" copy="Claimable rewards stay at the top. Claimed rewards remain available in history after settlement leaves Active Matches.">
            <div className="claim_center_summary">
              <div className="claim_summary_item">
                <span>Claimable</span>
                <strong>{totalClaimableAmount}</strong>
              </div>
              <div className="claim_summary_item">
                <span>Ready</span>
                <strong>{claimableClaims.length} rewards</strong>
              </div>
              <div className="claim_summary_item">
                <span>Claimed</span>
                <strong>{claimedClaims.length}</strong>
              </div>
              {claimReadMessage ? (
                <div className="claim_summary_item claim_summary_status">
                  <span>Read status</span>
                  <strong>{claimReadStatus === "error" && claimRecords.length > 0 ? "Using last read" : claimReadStatus === "error" ? "Unavailable" : "Loading"}</strong>
                </div>
              ) : null}
            </div>

            {claimReadMessage ? <p className={`feedback_text ${claimReadStatus === "error" ? "feedback_error" : "feedback_info"}`}>{claimReadMessage}</p> : null}

            {claimRecords.length === 0 && claimReadStatus !== "loading" ? (
              <EmptyState title="No settled rewards yet." copy="Claimable and claimed rewards will appear here after settlement." />
            ) : (
              <div className="claim_center_stack">
                <div className="claim_section_header">
                  <div>
                    <h3>Claimable rewards</h3>
                    <p>Real claim discovery records only. Claiming credits Palate Balance before wallet withdrawal.</p>
                  </div>
                </div>

                {claimableClaims.length > 0 ? (
                  <div className="claim_rows">
                    {claimableClaims.map((claim) => (
                      <ClaimCard
                        actionDisabled={!walletReady}
                        claim={claim}
                        key={claim.claimKey}
                        loading={claimBusy}
                        onClaim={() => claimReward(claim)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="claim_empty_inline">
                    <span>No claimable rewards right now.</span>
                  </div>
                )}

                {claimedClaims.length > 0 ? (
                  <div className="claim_history_section">
                    <button
                      className="claim_history_toggle"
                      onClick={() => {
                        setHistoryTouched(true);
                        setHistoryOpen((current) => !current);
                      }}
                      type="button"
                    >
                      <span>Claimed history</span>
                      <strong>{claimedClaims.length}</strong>
                    </button>
                    {historyOpen ? (
                      <div className="claim_rows claim_rows_history">
                        {claimedClaims.map((claim) => (
                          <ClaimCard
                            actionDisabled
                            claim={claim}
                            key={claim.claimKey}
                            loading={false}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
            {feedback ? <p className={`feedback_text feedback_${feedback.type}`}>{feedback.message}</p> : null}
          </SectionPanel>
        </div>
      )}
    </div>
  );
}
