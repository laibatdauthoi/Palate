"use client";

import { useState } from "react";
import { ActionButton } from "@/components/action_button";
import { ClaimCard } from "@/components/claim_card";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { usePalate } from "@/providers/palate_provider";

export default function ProfilePage() {
  const { balance, claimRecords, mockWalletAddress, userSummary } = usePalate();
  const [tab, setTab] = useState<"Stats" | "Claims">("Stats");
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
    <div className="page_stack">
      <PageHeader
        eyebrow="Profile"
        title="Balance, stats, and Buff Rewards."
        copy="Claims credit Palate Balance first. Wallet withdrawal is a separate action after available balance updates."
        actions={<ActionButton variant="secondary">Mock Withdraw</ActionButton>}
      />

      <div className="profile_summary_grid">
        <SectionPanel>
          <div className="stat_card">
            <span>Wallet</span>
            <strong>{mockWalletAddress}</strong>
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
                <ClaimCard claim={claim} key={claim.id} />
              ))}
            </div>
          </SectionPanel>
          <SectionPanel title="Buff Rewards">
            <div className="stack">
              {claimRecords.filter((claim) => claim.type === "buff").map((claim) => (
                <ClaimCard claim={claim} key={claim.id} />
              ))}
            </div>
          </SectionPanel>
        </div>
      )}
    </div>
  );
}
