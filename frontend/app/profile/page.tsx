"use client";

import { useState } from "react";
import { ActionButton } from "@/components/action_button";
import { ClaimCard } from "@/components/claim_card";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { mock_claims, mock_stats } from "@/data/mock_data";

const profile_stats = [
  { label: "Push count", value: mock_stats.pushCount },
  { label: "Push wins", value: mock_stats.pushWins },
  { label: "Push losses", value: mock_stats.pushLosses },
  { label: "Push win rate", value: mock_stats.pushWinRate },
  { label: "Push profit", value: mock_stats.pushProfit },
  { label: "Buff count", value: mock_stats.buffCount },
  { label: "Buff wins", value: mock_stats.buffWins },
  { label: "Buff losses", value: mock_stats.buffLosses },
  { label: "Buff win rate", value: mock_stats.buffWinRate },
  { label: "Buff profit", value: mock_stats.buffProfit },
  { label: "Total pushed", value: mock_stats.totalPushed },
  { label: "Total buffed", value: mock_stats.totalBuffed }
];

export default function ProfilePage() {
  const [tab, setTab] = useState<"Stats" | "Claims">("Stats");

  return (
    <div className="page_stack">
      <PageHeader
        eyebrow="Profile"
        title="Balance, stats, and Buff Rewards."
        copy="Claims credit Palate Balance first. Wallet withdrawal is a separate action after available balance updates."
        actions={<ActionButton variant="secondary">Mock Withdraw</ActionButton>}
      />

      <div className="panel_grid">
        <SectionPanel>
          <div className="stat_card">
            <span>Wallet</span>
            <strong>{mock_stats.wallet}</strong>
          </div>
        </SectionPanel>
        <SectionPanel accent>
          <div className="stat_card">
            <span>Palate Balance</span>
            <strong>{mock_stats.availableBalance}</strong>
          </div>
        </SectionPanel>
        <SectionPanel>
          <div className="stat_card">
            <span>Claimable amount</span>
            <strong>{mock_stats.claimableAmount}</strong>
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
              {mock_claims.filter((claim) => claim.type === "Push").map((claim) => (
                <ClaimCard claim={claim} key={claim.id} />
              ))}
            </div>
          </SectionPanel>
          <SectionPanel title="Buff Rewards">
            <div className="stack">
              {mock_claims.filter((claim) => claim.type === "Buff").map((claim) => (
                <ClaimCard claim={claim} key={claim.id} />
              ))}
            </div>
          </SectionPanel>
        </div>
      )}
    </div>
  );
}
