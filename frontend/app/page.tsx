"use client";

import { ActionButton } from "@/components/action_button";
import { EmptyState } from "@/components/empty_state";
import { MatchCard } from "@/components/match_card";
import { WaitingPushCard } from "@/components/waiting_push_card";
import { SectionPanel } from "@/components/section_panel";
import { app_config } from "@/config/app_config";
import { usePalate } from "@/providers/palate_provider";

export default function HomePage() {
  const { activeMatches, balance, settleMatch, userSummary, waitingPushes } = usePalate();
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

      <SectionPanel title="Waiting Pushes" copy="Waiting pushes can be challenged by same-category idle media. Hidden match direction, score, and odds are not shown here.">
        {waitingPushes.length > 0 ? (
          <div className="compact_card_grid compact_card_grid_waiting">
            {waitingPushes.map((push) => (
              <WaitingPushCard challengeHref={`/push?challengeId=${push.id}`} key={push.id} push={push} />
            ))}
          </div>
        ) : (
          <EmptyState title="No waiting pushes" copy="Push a registered idle media item to make it available for challenge." actionLabel="Go to Push" actionHref="/push" />
        )}
      </SectionPanel>

      <SectionPanel title="Active Matches" copy="Active match cards stay compact and only show the information needed to continue to Buff.">
        {activeMatches.length > 0 ? (
          <div className="compact_card_grid compact_card_grid_matches">
            {activeMatches.map((match) => (
              <MatchCard
                actionHref="/buff"
                key={match.id}
                match={match}
                onSettle={match.status === "active" ? () => settleMatch(match.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No active matches" copy="Find Match or challenge a waiting push to start a live match." actionLabel="Go to Buff" actionHref="/buff" />
        )}
      </SectionPanel>
    </div>
  );
}
