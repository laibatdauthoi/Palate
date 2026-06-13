"use client";

import { ActionButton } from "@/components/action_button";
import { MatchCard } from "@/components/match_card";
import { SectionPanel } from "@/components/section_panel";
import { app_config } from "@/config/app_config";
import { usePalate } from "@/providers/palate_provider";

export default function HomePage() {
  const { activeMatches, balance, userSummary } = usePalate();
  const stat_cards = [
    { label: "Active matches", value: String(activeMatches.length) },
    { label: "Pending Buffs", value: userSummary.pendingBuffs },
    { label: "Claimable", value: userSummary.claimableAmount },
    { label: "Palate Balance", value: balance.availableBalance }
  ];
  const featuredMatch = activeMatches[0];

  return (
    <div className="page_stack page_home">
      <section className="home_hero">
        <div className="stack">
          <span className="eyebrow">Palate Lobby</span>
          <h1 className="hero_title">Buff is the signal. Media is the weapon.</h1>
          <p className="hero_copy">
            Enter a random active match, choose the side that deserves to win, and keep live score, pools, and direction hidden until settlement.
          </p>
          <div className="cluster">
            <ActionButton className="hero_primary_cta" href="/buff">Buff Random Match</ActionButton>
            <ActionButton href="/my-media/upload" variant="secondary">Upload Media</ActionButton>
            <ActionButton href="/push" variant="secondary">Push Media</ActionButton>
          </div>
          <p className="mock_note">{app_config.mockMode ? "Aptos Testnet and Shelby integration are prepared for the next phase." : app_config.networkLabel}</p>
        </div>
        {featuredMatch ? (
          <div className="hero_match_preview">
            <MatchCard match={featuredMatch} />
          </div>
        ) : null}
      </section>

      <div className="panel_grid">
        {stat_cards.map((stat) => (
          <SectionPanel key={stat.label}>
            <div className="stat_card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          </SectionPanel>
        ))}
      </div>

      <SectionPanel title="Featured matches" copy="Active matches can be shown without exposing live score, Buff pool, leading side, odds, win probability, or supporter direction.">
        <div className="wide_two_column">
          {activeMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}
