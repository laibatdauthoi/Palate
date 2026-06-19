"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { EmptyState } from "@/components/empty_state";
import { MatchCard } from "@/components/match_card";
import { WaitingPushCard } from "@/components/waiting_push_card";
import { SectionPanel } from "@/components/section_panel";
import { usePalate } from "@/providers/palate_provider";
import { logPageMount, logUiPerf } from "@/utils/ui_perf";

const live_refresh_interval_ms = 18000;

export default function HomePage() {
  const { activeMatches, refreshPublicGameState, settleMatch, waitingPushes } = usePalate();
  const [activityTab, setActivityTab] = useState<"waiting" | "matches">("waiting");
  const waitingCount = waitingPushes.length;
  const activeCount = activeMatches.length;
  const activityTabs = useMemo(() => ([
    { key: "waiting" as const, label: "Waiting Pushes", count: waitingCount },
    { key: "matches" as const, label: "Active Matches", count: activeCount }
  ]), [activeCount, waitingCount]);

  useEffect(() => {
    logPageMount("Home");
  }, []);

  useEffect(() => {
    function runRefresh(source: "interval" | "visible" | "mount") {
      if (document.hidden) {
        logUiPerf("liveRefresh:skippedHidden", { page: "home", source });
        return;
      }

      void refreshPublicGameState({
        waitingPushes: true,
        activeMatches: true,
        source: `home:${source}`
      });
    }

    runRefresh("mount");
    const intervalId = window.setInterval(() => runRefresh("interval"), live_refresh_interval_ms);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        runRefresh("visible");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshPublicGameState]);

  return (
    <div className="page_stack page_home">
      <section className="home_hero home_hero_compact">
        <div className="stack home_hero_stack">
          <span className="eyebrow">Palate Lobby</span>
          <h1 className="home_hero_title">Upload media, push it into a duel, Buff live matches, and claim rewards when your side wins.</h1>
          <div className="home_hero_actions">
            <ActionButton className="home_cta_button hero_primary_cta" href="/buff">Buff Random Match</ActionButton>
            <ActionButton className="home_cta_button" href="/my-media/upload" variant="secondary">Upload Media</ActionButton>
            <ActionButton className="home_cta_button" href="/push" variant="secondary">Push Media</ActionButton>
          </div>
        </div>
      </section>

      <SectionPanel className="home_activity_panel" title="Lobby Activity">
        <div className="home_activity_tabs" aria-label="Home activity tabs" role="tablist">
          {activityTabs.map((tab) => (
            <button
              aria-selected={activityTab === tab.key}
              className={`home_activity_tab ${activityTab === tab.key ? "active" : ""}`}
              key={tab.key}
              onClick={() => setActivityTab(tab.key)}
              role="tab"
              type="button"
            >
              <span>{tab.label}</span>
              <span className="home_activity_count">{tab.count}</span>
            </button>
          ))}
        </div>
        {activityTab === "waiting" ? (
          waitingPushes.length > 0 ? (
            <div className="compact_card_grid compact_card_grid_waiting">
              {waitingPushes.map((push) => (
                <WaitingPushCard challengeHref={`/push?challengeId=${push.id}`} key={push.id} push={push} />
              ))}
            </div>
          ) : (
            <EmptyState title="No waiting pushes." copy="" actionLabel="Go to Push" actionHref="/push" />
          )
        ) : activeMatches.length > 0 ? (
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
          <EmptyState title="No active matches." copy="" actionLabel="Go to Buff" actionHref="/buff" />
        )}
      </SectionPanel>
    </div>
  );
}
