"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ImageUp, Send, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/action_button";
import { BuffWorkflow } from "@/components/buff_workflow";
import { ChallengeFlowModal } from "@/components/challenge_flow_modal";
import { ErrorState } from "@/components/error_state";
import { FilterBar } from "@/components/filter_bar";
import { LoadingState } from "@/components/loading_state";
import { MatchCard } from "@/components/match_card";
import { PageHeader } from "@/components/page_header";
import { PushCreateWorkflow } from "@/components/push_create_workflow";
import { TypewriterHeadline } from "@/components/typewriter_headline";
import { WaitingPushCard } from "@/components/waiting_push_card";
import { usePalateWallet } from "@/providers/wallet_provider";
import { usePalate } from "@/providers/palate_provider";
import { formatOctasToApt, parseAptToOctas } from "@/services/aptos_service";
import type { MediaCategory } from "@/types/palate";
import { getPushEligibility } from "@/utils/push_eligibility";
import { logPageMount, logUiPerf } from "@/utils/ui_perf";

const PUBLIC_HOME_REFRESH_INTERVAL_MS = 15000;
const PUBLIC_HOME_STALE_AFTER_MS = 15000;
const category_labels: Record<MediaCategory, string> = {
  meme: "Meme",
  image: "Image",
  audio: "Audio",
  video: "Video"
};

export default function HomePage() {
  return (
    <Suspense fallback={<div className="page_stack page_home" />}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const { activeMatches, balance, challengePush, chainRead, clearFeedback, feedback, mediaReadStatus, mediaRecords, processingAction, publicGameReadStatus, readLifecycle, refreshPublicGameState, settleMatch, waitingPushes, walletReadCache } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activityTab, setActivityTab] = useState<"waiting" | "matches">("waiting");
  const [buffWorkflowOpen, setBuffWorkflowOpen] = useState(false);
  const [pushWorkflowOpen, setPushWorkflowOpen] = useState(false);
  const [challengePushId, setChallengePushId] = useState<number | null>(null);
  const [challengeMediaId, setChallengeMediaId] = useState("");
  const [routePrefillReason, setRoutePrefillReason] = useState<string | null>(null);
  const [dismissedChallengeId, setDismissedChallengeId] = useState<number | null>(null);
  const [lastAppliedChallengeQuery, setLastAppliedChallengeQuery] = useState<string | null>(null);
  const createMediaQuery = searchParams.get("mediaId");
  const challengePushQuery = searchParams.get("challengeId") ?? searchParams.get("pushId");
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
  const mediaOwnedByCurrentWallet = walletReadCache.userMedia.ownerAddress === normalizedWalletAddress;
  const mediaHasCurrentWalletData = mediaOwnedByCurrentWallet && walletReadCache.userMedia.lastSuccessfulReadAt !== null;
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
  const isLoadingEligibleMedia = walletReady && (!mediaOwnedByCurrentWallet || ((mediaReadStatus === "idle" || mediaReadStatus === "loading") && !mediaHasCurrentWalletData));
  const activityTabs = useMemo(() => ([
    { key: "waiting" as const, label: "Waiting Pushes", count: waitingCount },
    { key: "matches" as const, label: "Matches", count: activeCount }
  ]), [activeCount, waitingCount]);
  const isPublicGameInitialLoad = !readLifecycle.hasLoadedPublicGameState && (publicGameReadStatus === "idle" || publicGameReadStatus === "loading");
  const homePublicGameErrored = readLifecycle.hasLoadedPublicGameState && publicGameReadStatus === "error";
  const lobbyLoading = isPublicGameInitialLoad;
  const showWaitingError = activityTab === "waiting" && homePublicGameErrored && waitingPushes.length === 0;
  const showMatchesError = activityTab === "matches" && homePublicGameErrored && activeMatches.length === 0;
  const showWaitingEmpty = activityTab === "waiting" && readLifecycle.hasLoadedPublicGameState && publicGameReadStatus === "ready" && waitingPushes.length === 0;
  const showMatchesEmpty = activityTab === "matches" && readLifecycle.hasLoadedPublicGameState && publicGameReadStatus === "ready" && activeMatches.length === 0;
  const lastSuccessfulPublicReadAt = walletReadCache.publicGameState.lastSuccessfulReadAt;

  useEffect(() => {
    logPageMount("Home");
  }, []);

  useEffect(() => {
    if (createMediaQuery) {
      setPushWorkflowOpen(true);
    }
  }, [createMediaQuery]);

  useEffect(() => {
    if (challengePushId === null || selectedPush) {
      return;
    }

    setChallengePushId(null);
    setChallengeMediaId("");
    clearFeedback();
  }, [challengePushId, clearFeedback, selectedPush]);

  useEffect(() => {
    function isPublicHomeDataStale() {
      return lastSuccessfulPublicReadAt === null
        || (Date.now() - lastSuccessfulPublicReadAt) > PUBLIC_HOME_STALE_AFTER_MS;
    }

    async function runRefresh(
      source: "interval" | "visible" | "focus" | "mount" | "mount-stale",
      options: { force?: boolean; staleOnly?: boolean } = {}
    ) {
      if (document.visibilityState !== "visible") {
        logUiPerf("liveRefresh:skippedHidden", { page: "home", source });
        return;
      }

      if (options.staleOnly && !isPublicHomeDataStale()) {
        logUiPerf("liveRefresh:skippedFresh", { page: "home", source });
        return;
      }

      await refreshPublicGameState({
        waitingPushes: true,
        activeMatches: true,
        source: `home:${source}`,
        force: options.force ?? false
      });
    }

    if (!readLifecycle.hasLoadedPublicGameState || publicGameReadStatus === "idle") {
      void runRefresh("mount", { force: true });
    } else if (isPublicHomeDataStale()) {
      void runRefresh("mount-stale", { force: true, staleOnly: true });
    }
    const intervalId = window.setInterval(() => {
      void runRefresh("interval", { force: true });
    }, PUBLIC_HOME_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runRefresh("visible", { force: true, staleOnly: true });
      }
    };
    const handleWindowFocus = () => {
      void runRefresh("focus", { force: true, staleOnly: true });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [lastSuccessfulPublicReadAt, publicGameReadStatus, readLifecycle.hasLoadedPublicGameState, refreshPublicGameState]);

  const replaceHomeQuery = useCallback((next: URLSearchParams) => {
    const query = next.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }, [router]);

  const clearChallengeQuery = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("challengeId");
    next.delete("pushId");
    replaceHomeQuery(next);
  }, [replaceHomeQuery, searchParams]);

  useEffect(() => {
    if (!challengePushQuery) {
      setLastAppliedChallengeQuery(null);
      return;
    }

    if (challengePushQuery === lastAppliedChallengeQuery) {
      return;
    }

    const nextId = Number(challengePushQuery);
    if (Number.isNaN(nextId)) {
      clearChallengeQuery();
      setLastAppliedChallengeQuery(challengePushQuery);
      return;
    }

    if (dismissedChallengeId === nextId) {
      return;
    }

    const push = openWaitingPushes.find((candidate) => candidate.id === nextId);
    if (!push) {
      setRoutePrefillReason("Selected waiting push is no longer available.");
      setChallengePushId(null);
      setChallengeMediaId("");
      clearFeedback();
      clearChallengeQuery();
      setLastAppliedChallengeQuery(challengePushQuery);
      return;
    }

    setChallengePushId(nextId);
    setChallengeMediaId("");
    setRoutePrefillReason(null);
    clearFeedback();
    setActivityTab("waiting");
    setLastAppliedChallengeQuery(challengePushQuery);
  }, [challengePushQuery, clearChallengeQuery, clearFeedback, dismissedChallengeId, lastAppliedChallengeQuery, openWaitingPushes]);

  function closeChallengeModal() {
    setDismissedChallengeId(challengePushId);
    setChallengePushId(null);
    setChallengeMediaId("");
    clearFeedback();
    clearChallengeQuery();
  }

  return (
    <div className="page_stack page_home">
      <PageHeader
        eyebrow="Palate Lobby"
        title={<TypewriterHeadline className="home_typewriter_headline" text="Upload media, push it into a duel, Buff live matches, and claim rewards when your side wins." />}
        variant="floating"
        density="compact"
        stacked
        lifted
        actions={
          <div aria-label="Home actions" className="home_command_tiles" role="group">
            <button className="home_command_tile home_command_tile_primary" onClick={() => setBuffWorkflowOpen(true)} type="button">
              <Sparkles aria-hidden="true" className="home_command_tile_icon" />
              <span className="home_command_tile_label">Buff</span>
            </button>
            <button className="home_command_tile" onClick={() => setPushWorkflowOpen(true)} type="button">
              <Send aria-hidden="true" className="home_command_tile_icon" />
              <span className="home_command_tile_label">Push</span>
            </button>
            <Link className="home_command_tile" href="/my-media/upload">
              <ImageUp aria-hidden="true" className="home_command_tile_icon" />
              <span className="home_command_tile_label">Upload</span>
            </Link>
          </div>
        }
      />

      <FilterBar activeKey={activityTab} ariaLabel="Home activity tabs" items={activityTabs} onChange={setActivityTab} tablist />

      {routePrefillReason ? <p className="feedback_text feedback_error">{routePrefillReason}</p> : null}

      <div className="home_activity_content" aria-live="polite">
        {showWaitingError || showMatchesError ? (
          <ErrorState
            variant="section"
            title="Lobby activity unavailable"
            copy="Waiting pushes and active matches are temporarily unavailable while the chain read is retried."
          />
        ) : lobbyLoading ? (
          <LoadingState
            variant="section"
            label="Loading lobby activity"
            copy="Waiting pushes and active matches are loading from chain."
          />
        ) : activityTab === "waiting" ? (
          !showWaitingEmpty ? (
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
                    setRoutePrefillReason(null);
                    clearFeedback();
                  }}
                  push={push}
                  variant="compact"
                />
              ))}
            </div>
          ) : (
            <div className="state_card empty_state full_width_state">
              <span className="state_mark">Empty</span>
              <h3>No waiting pushes.</h3>
              <p />
              <ActionButton onClick={() => setPushWorkflowOpen(true)} variant="secondary">Push Media</ActionButton>
            </div>
          )
        ) : !showMatchesEmpty ? (
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
          <div className="state_card empty_state full_width_state">
            <span className="state_mark">Empty</span>
            <h3>No active matches.</h3>
            <p />
            <ActionButton onClick={() => setBuffWorkflowOpen(true)} variant="secondary">Buff Random Match</ActionButton>
          </div>
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
        onClose={closeChallengeModal}
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

      <BuffWorkflow
        onClose={() => setBuffWorkflowOpen(false)}
        open={buffWorkflowOpen}
        presentation="modal"
        sourceContext="home-buff"
      />

      <PushCreateWorkflow
        mediaIdQuery={createMediaQuery}
        onClose={() => setPushWorkflowOpen(false)}
        onMediaQueryApplied={() => setActivityTab("waiting")}
        open={pushWorkflowOpen}
        presentation="modal"
        sourceContext="home-push"
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
