"use client";

import { useState } from "react";
import { ActionButton } from "@/components/action_button";
import { AmountInput } from "@/components/amount_input";
import { ClaimCard } from "@/components/claim_card";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";

export default function ProfilePage() {
  const { balance, claimMockReward, claimRecords, depositBalance, feedback, processingAction, userSummary, withdrawBalance } = usePalate();
  const { walletAddress } = usePalateWallet();
  const [tab, setTab] = useState<"Stats" | "Claims">("Stats");
  const [balanceAmount, setBalanceAmount] = useState("1.000");
  const balanceBusy = processingAction === "deposit" || processingAction === "withdraw";
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

      <SectionPanel title="Manage Palate Balance" copy="Adjust available Palate Balance for the current session.">
        <div className="profile_balance_controls">
          <AmountInput label="Amount" onChange={setBalanceAmount} placeholder="1.000 APT" value={balanceAmount} />
          <ActionButton disabled={balanceBusy} onClick={() => depositBalance(balanceAmount)} variant="secondary">
            {processingAction === "deposit" ? "Depositing" : "Deposit"}
          </ActionButton>
          <ActionButton disabled={balanceBusy} onClick={() => withdrawBalance(balanceAmount)} variant="secondary">
            {processingAction === "withdraw" ? "Withdrawing" : "Withdraw"}
          </ActionButton>
        </div>
        {feedback ? <p className={`feedback_text feedback_${feedback.type}`}>{feedback.message}</p> : null}
      </SectionPanel>

      <SectionPanel>
        <div className="tabs">
          {(["Stats", "Claims"] as const).map((item) => (
            <button className={`tab_button ${tab === item ? "active" : ""}`} key={item} onClick={() => setTab(item)}>
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
          <SectionPanel title="Push claims">
            <div className="stack">
              {claimRecords.filter((claim) => claim.type === "push").map((claim) => (
                <ClaimCard claim={claim} key={claim.id} loading={processingAction === "claimReward"} onClaim={() => claimMockReward(claim.id)} />
              ))}
            </div>
            {feedback ? <p className={`feedback_text feedback_${feedback.type}`}>{feedback.message}</p> : null}
          </SectionPanel>
          <SectionPanel title="Buff Rewards">
            <div className="stack">
              {claimRecords.filter((claim) => claim.type === "buff").map((claim) => (
                <ClaimCard claim={claim} key={claim.id} loading={processingAction === "claimReward"} onClaim={() => claimMockReward(claim.id)} />
              ))}
            </div>
            <p className="mock_note">Claims credit Palate Balance before wallet withdrawal.</p>
          </SectionPanel>
        </div>
      )}
    </div>
  );
}
