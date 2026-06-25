"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { ChallengeFlowModal } from "@/components/challenge_flow_modal";
import { EmptyState } from "@/components/empty_state";
import { FilterBar, FilterTabs } from "@/components/filter_bar";
import { LoadingState } from "@/components/loading_state";
import { MatchCard } from "@/components/match_card";
import { PageHeader } from "@/components/page_header";
import { WaitingPushCard } from "@/components/waiting_push_card";
import { usePalateWallet } from "@/providers/wallet_provider";
import { usePalate } from "@/providers/palate_provider";
import { formatOctasToApt, parseAptToOctas } from "@/services/aptos_service";
import type { MediaCategory } from "@/types/palate";
import { getPushEligibility } from "@/utils/push_eligibility";
import { logPageMount, logUiPerf } from "@/utils/ui_perf";

const live_refresh_interval_ms = 18000;
const category_labels: Record<MediaCategory, string> = {
  meme: "Meme",
  image: "Image",
  audio: "Audio",
  video: "Video"
};

export default function HomePage() {
  const { activeMatches, balance, challengePush, chainRead, clearFeedback, feedback, mediaReadStatus, mediaRecords, processingAction, publicGameReadStatus, readLifecycle, refreshPublicGameState, settleMatch, waitingPushes } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const [activityTab, setActivityTab] = useState<"waiting" | "matches">("waiting");
  const [challengePushId, setChallengePushId] = useState<number | null>(null);
  const [challengeMediaId, setChallengeMediaId] = useState("");
  const waitingCount = waitingPushes.length;
  const activeCount = activeMatches.length;
  const walletReady = walletStatus === "connected";
  const openWaitingPushes = waitingPushes.filter((push) =>
    push.status === "open"
      && getPushEligibility(push.media, { requireIdle: false }).eligible
  );
  const selectedPush = openWaitingPushes.find((push) => push.id === challengePushId) ?? null;
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const selectedPushIsOwned = Boolean(
    selectedPush
      && normalizedWalletAddress
      && normalizeAddress(selectedPush.pusherAddress) === normalizedWalletAddress
  );
  const selfChallengeReason = selectedPushIsOwned ? "You cannot challenge your own push." : null;
  const pushableMedia = mediaRecords.filter((media) =>
    (media.status === "idle" || media.status === "settled" || (media.status === "waiting" && media.waitingPushExpired === true && typeof media.waitingPushId === "number"))
      && getPushEligibility(media, { allowExpiredWaitingPush: true }).eligible
  );
  const challengeOptions = selectedPush ? pushableMedia.filter((media) => media.category === selectedPush.media.category) : [];
  const selectedPushCategoryLabel = selectedPush ? category_labels[selectedPush.media.category].toUpperCase() : "MEDIA";
  const minPushOctas = chainRead.protocolConfig?.minPushAmount ? BigInt(chainRead.protocolConfig.minPushAmount) : null;
  const requiredChallengeOctas = selectedPush?.minChallengeAmountOctas
    ? BigInt(selectedPush.minChallengeAmountOctas)
    : minPushOctas;
  const effectiveChallengeOctas = minPushOctas !== null && requiredChallengeOctas !== null
    ? (requiredChallengeOctas > minPushOctas ? requiredChallengeOctas : minPushOctas)
    : null;
  const requiredChallengeLabel = effectiveChallengeOctas !== null ? formatOctasToApt(effectiveChallengeOctas) : "loading";
  const availableBalanceOctas = parseAmountOctas(balance.availableBalance);
  const challengeBalanceValid = effectiveChallengeOctas !== null && availableBalanceOctas !== null && effectiveChallengeOctas <= availableBalanceOctas;
  const challengeFeedback = feedback?.scope === "challenge" ? feedback : null;
  const pushBusy = processingAction === "challengePush";
  const isLoadingEligibleMedia = walletReady && mediaReadStatus === "loading" && !readLifecycle.hasLoadedMedia;
  const activityTabs = useMemo(() => ([
    { key: "waiting" as const, label: "Waiting Pushes", count: waitingCount },
    { key: "matches" as const, label: "Active Matches", count: activeCount }
  ]), [activeCount, waitingCount]);
  const lobbyLoading = publicGameReadStatus === "loading" && !readLifecycle.hasLoadedPublicGameState;

  useEffect(() => {
    logPageMount("Home");
  }, []);

  useEffect(() => {
    if (challengePushId === null || selectedPush) return;
    setChallengePushId(null);
    setChallengeMediaId("");
    clearFeedback();
  }, [challengePushId, clearFeedback, selectedPush]);

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
      <PageHeader
        eyebrow="Palate Lobby"
        title="Upload media, push it into a duel, Buff live matches, and claim rewards when your side wins."
        className="page_header_floating page_header_stacked home_page_header"
        actions={
          <>
            <ActionButton className="home_cta_button hero_primary_cta" href="/buff">Buff Random Match</ActionButton>
            <ActionButton className="home_cta_button" href="/my-media/upload" variant="secondary">Upload Media</ActionButton>
            <ActionButton className="home_cta_button" href="/push" variant="secondary">Push Media</ActionButton>
          </>
        }
      />

      <FilterBar ariaLabel="Lobby Activity">
        <FilterTabs activeKey={activityTab} ariaLabel="Home activity tabs" items={activityTabs} onChange={setActivityTab} tablist />
      </FilterBar>

      <div className="home_activity_content" aria-live="polite">
        {lobbyLoading ? (
          <LoadingState
            className="full_width_state"
            label="Loading lobby activity"
            copy="Waiting pushes and active matches are loading from chain."
          />
        ) : activityTab === "waiting" ? (
          waitingPushes.length > 0 ? (
            <div className="compact_card_grid compact_card_grid_waiting waiting_grid">
              {waitingPushes.map((push) => (
                <WaitingPushCard
                  challengeDisabledReason={
                    normalizedWalletAddress && normalizeAddress(push.pusherAddress) === normalizedWalletAddress
                      ? "You cannot challenge your own push."
                      : null
                  }
                  key={push.id}
                  onChallenge={() => {
                    setChallengePushId(push.id);
                    setChallengeMediaId("");
                    clearFeedback();
                  }}
                  push={push}
                  variant="compact"
                />
              ))}
            </div>
          ) : (
            <EmptyState className="full_width_state" title="No waiting pushes." copy="" actionLabel="Go to Push" actionHref="/push" />
          )
        ) : activeMatches.length > 0 ? (
            <div className="compact_card_grid compact_card_grid_matches matches_grid">
              {activeMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onSettle={match.status === "active" ? () => settleMatch(match.id) : undefined}
                />
            ))}
          </div>
        ) : (
          <EmptyState className="full_width_state" title="No active matches." copy="" actionLabel="Go to Buff" actionHref="/buff" />
        )}
      </div>

      <ChallengeFlowModal
        challengeBalanceValid={challengeBalanceValid}
        challengeFeedback={challengeFeedback}
        challengeOptions={challengeOptions}
        isLoadingEligibleMedia={isLoadingEligibleMedia}
        onBackToMedia={() => {
          setChallengeMediaId("");
          clearFeedback();
        }}
        onClose={() => {
          setChallengePushId(null);
          setChallengeMediaId("");
          clearFeedback();
        }}
        onSelectMedia={(mediaId) => {
          setChallengeMediaId(mediaId);
          clearFeedback();
        }}
        onSubmit={() => {
          if (!selectedPush || selectedPushIsOwned) return;
          challengePush(selectedPush.id, Number(challengeMediaId), requiredChallengeLabel);
        }}
        open={challengePushId !== null}
        pushBusy={pushBusy}
        requiredChallengeLabel={requiredChallengeLabel}
        selectedMediaId={challengeMediaId}
        selectedPush={selectedPush}
        selectedPushCategoryLabel={selectedPushCategoryLabel}
        selfChallengeReason={selfChallengeReason}
        walletReady={walletReady}
      />
    </div>
  );
}

function normalizeAddress(address: string | null | undefined) {
  return address?.trim().toLowerCase() ?? null;
}

function parseAmountOctas(value: string) {
  try {
    return BigInt(parseAptToOctas(value, { allowZero: true }));
  } catch {
    return null;
  }
}
