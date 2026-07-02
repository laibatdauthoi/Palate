"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/action_button";
import { ChallengeFlowModal } from "@/components/challenge_flow_modal";
import { FilterBar } from "@/components/filter_bar";
import { MatchCard } from "@/components/match_card";
import { LoadingState } from "@/components/loading_state";
import { PageHeader } from "@/components/page_header";
import { PushCreateWorkflow } from "@/components/push_create_workflow";
import { WaitingPushCard } from "@/components/waiting_push_card";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { formatOctasToApt, parseAptToOctas } from "@/services/aptos_service";
import type { MediaCategory } from "@/types/palate";
import { getPushEligibility } from "@/utils/push_eligibility";
import { app_config } from "@/config/app_config";
import { logPageMount, logUiPerf, uiPerfNow } from "@/utils/ui_perf";

const category_labels: Record<MediaCategory, string> = {
  meme: "Meme",
  image: "Image",
  audio: "Audio",
  video: "Video"
};
const live_refresh_interval_ms = 18000;

export default function PushPage() {
  return (
    <Suspense fallback={<div className="page_stack page_push" />}>
      <PushPageContent />
    </Suspense>
  );
}

function PushPageContent() {
  const { activeMatches, balance, challengePush, chainRead, clearFeedback, feedback, mediaReadStatus, mediaRecords, processingAction, publicGameReadStatus, readLifecycle, refreshPublicGameState, settleMatch, waitingPushes, walletReadCache } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"Waiting" | "Live Matches">("Waiting");
  const [modalOpen, setModalOpen] = useState(false);
  const [challengePushId, setChallengePushId] = useState<number | null>(null);
  const [challengeMediaId, setChallengeMediaId] = useState("");
  const [routePrefillReason, setRoutePrefillReason] = useState<string | null>(null);
  const [dismissedChallengeId, setDismissedChallengeId] = useState<number | null>(null);
  const [lastAppliedChallengeQuery, setLastAppliedChallengeQuery] = useState<string | null>(null);
  const createMediaQuery = searchParams.get("mediaId");
  const challengePushQuery = searchParams.get("challengeId") ?? searchParams.get("pushId");
  const openWaitingPushes = waitingPushes.filter((push) =>
    push.status === "open"
      && getPushEligibility(push.media, { requireIdle: false }).eligible
  );
  const selectedPush = openWaitingPushes.find((push) => push.id === challengePushId) ?? null;
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const mediaOwnedByCurrentWallet = walletReadCache.userMedia.ownerAddress === normalizedWalletAddress;
  const mediaHasCurrentWalletData = mediaOwnedByCurrentWallet && walletReadCache.userMedia.lastSuccessfulReadAt !== null;
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
  const challengeOptions = selectedPush ? pushableMedia.filter((media) => media.category === selectedPush.media.category) : pushableMedia;
  const selectedPushCategoryLabel = selectedPush ? category_labels[selectedPush.media.category].toUpperCase() : "MEDIA";
  const challengeFeedback = feedback?.scope === "challenge" ? feedback : null;
  const settleFeedback = feedback?.scope === "settle" ? feedback : null;
  const pushBusy = processingAction === "challengePush";
  const walletReady = walletStatus === "connected";
  const minPushOctas = chainRead.protocolConfig?.minPushAmount ? BigInt(chainRead.protocolConfig.minPushAmount) : null;
  const minPushLabel = minPushOctas !== null ? formatOctasToApt(minPushOctas) : "loading";
  const requiredChallengeOctas = selectedPush?.minChallengeAmountOctas
    ? BigInt(selectedPush.minChallengeAmountOctas)
    : minPushOctas;
  const effectiveChallengeOctas = minPushOctas !== null && requiredChallengeOctas !== null
    ? (requiredChallengeOctas > minPushOctas ? requiredChallengeOctas : minPushOctas)
    : null;
  const requiredChallengeLabel = effectiveChallengeOctas !== null ? formatOctasToApt(effectiveChallengeOctas) : minPushLabel;
  const availableBalanceOctas = parseAmountOctas(balance.availableBalance);
  const challengeBalanceValid = effectiveChallengeOctas !== null && availableBalanceOctas !== null && effectiveChallengeOctas <= availableBalanceOctas;
  const isLoadingEligibleMedia = walletReady && (!mediaOwnedByCurrentWallet || ((mediaReadStatus === "idle" || mediaReadStatus === "loading") && !mediaHasCurrentWalletData));
  const waitingSectionLoading = !readLifecycle.hasLoadedPublicGameState && (publicGameReadStatus === "idle" || publicGameReadStatus === "loading");
  const activeMatchesSectionLoading = !readLifecycle.hasLoadedPublicGameState && (publicGameReadStatus === "idle" || publicGameReadStatus === "loading");

  useEffect(() => {
    logPageMount("Push");
  }, []);

  useEffect(() => {
    function runRefresh(source: "interval" | "visible" | "mount") {
      if (document.hidden) {
        logUiPerf("liveRefresh:skippedHidden", { page: "push", source });
        return;
      }

      void refreshPublicGameState({
        waitingPushes: true,
        activeMatches: true,
        source: `push:${source}`
      });
    }

    if (!readLifecycle.hasLoadedPublicGameState || publicGameReadStatus === "idle") {
      runRefresh("mount");
    }
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
  }, [publicGameReadStatus, readLifecycle.hasLoadedPublicGameState, refreshPublicGameState]);

  const replacePushQuery = useCallback((next: URLSearchParams) => {
    const query = next.toString();
    router.replace(query ? `/push?${query}` : "/push", { scroll: false });
  }, [router]);

  const clearChallengeQuery = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("challengeId");
    next.delete("pushId");
    replacePushQuery(next);
  }, [replacePushQuery, searchParams]);

  function closeChallengeModal() {
    logUiPerf("challengeModalClose", {
      challengePushId,
      localStateUpdatedImmediately: true,
      routerAction: "replace"
    });
    setModalOpen(false);
    setDismissedChallengeId(challengePushId);
    setChallengePushId(null);
    setChallengeMediaId("");
    clearFeedback();
    clearChallengeQuery();
  }

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
      setModalOpen(false);
      clearChallengeQuery();
      setLastAppliedChallengeQuery(challengePushQuery);
      return;
    }

    setChallengePushId(nextId);
    setChallengeMediaId("");
    clearFeedback();
    setModalOpen(true);
    setTab("Waiting");
    setLastAppliedChallengeQuery(challengePushQuery);
  }, [challengePushQuery, clearChallengeQuery, clearFeedback, dismissedChallengeId, lastAppliedChallengeQuery, openWaitingPushes]);

  useEffect(() => {
    if (challengePushId === null || selectedPush || !modalOpen) {
      return;
    }

    setRoutePrefillReason("Selected waiting push is no longer available.");
    setChallengePushId(null);
    setChallengeMediaId("");
    setModalOpen(false);
    clearChallengeQuery();
  }, [challengePushId, clearChallengeQuery, clearFeedback, modalOpen, selectedPush]);

  function openChallenge(pushId: number) {
    const startedAt = uiPerfNow();
    const push = openWaitingPushes.find((candidate) => candidate.id === pushId);
    if (!push) {
      setRoutePrefillReason("Selected waiting push is no longer available.");
      clearChallengeQuery();
      logUiPerf("challengeModalOpen:end", {
        pushId,
        syncDurationMs: Math.round(uiPerfNow() - startedAt),
        resolved: false,
        reason: "waiting push not found"
      });
      return;
    }

    if (normalizedWalletAddress && normalizeAddress(push.pusherAddress) === normalizedWalletAddress) {
      setRoutePrefillReason("You cannot challenge your own push.");
      setDismissedChallengeId(null);
      logUiPerf("challengeModalOpen:end", {
        pushId,
        syncDurationMs: Math.round(uiPerfNow() - startedAt),
        resolved: false,
        reason: "self challenge blocked"
      });
      return;
    }

    const next = new URLSearchParams(searchParams.toString());
    next.set("challengeId", String(pushId));
    next.delete("pushId");
    setDismissedChallengeId(null);
    setRoutePrefillReason(null);
    setLastAppliedChallengeQuery(String(pushId));
    setChallengePushId(pushId);
    setChallengeMediaId("");
    clearFeedback();
    setModalOpen(true);
    setTab("Waiting");
    logUiPerf("challengeModalOpen", {
      pushId,
      localStateUpdatedImmediately: true,
      routerAction: "replace",
      providerRefreshTriggered: false
    });
    replacePushQuery(next);
    logUiPerf("challengeModalOpen:end", {
      pushId,
      syncDurationMs: Math.round(uiPerfNow() - startedAt),
      resolved: true
    });
  }

  useEffect(() => {
    if (!app_config.debugUiPerf) return;
    mediaRecords.forEach((media) => {
      const eligibility = getPushEligibility(media, { allowExpiredWaitingPush: true });
      console.debug("[Palate Push eligibility debug]", {
        mediaId: media.id,
        status: media.status,
        storageStatus: media.storageStatus ?? "uploaded",
        category: media.category,
        reason: eligibility.reason
      });
    });
  }, [mediaRecords]);

  return (
    <div className="page_stack page_push">
      <PageHeader
        eyebrow="Push"
        title="Challenge the board without exposing live match direction."
        copy="Waiting pushes can be challenged by same-category idle media. Live match cards hide score, Buff pool, leading side, odds, and win probability."
        actions={<ActionButton href="/my-media">Choose Media To Push</ActionButton>}
        variant="floating"
        density="compact"
        stacked
        lifted
      />

      <FilterBar
        activeKey={tab}
        ariaLabel="Push views"
        items={[{ key: "Waiting", label: "Waiting" }, { key: "Live Matches", label: "Live Matches" }]}
        onChange={(item) => {
          const startedAt = uiPerfNow();
          setTab(item);
          logUiPerf("pushPageTabClick", {
            tab: item,
            localStateUpdatedImmediately: true,
            routerAction: "none",
            providerRefreshTriggered: false,
            syncDurationMs: Math.round(uiPerfNow() - startedAt)
          });
        }}
      />

      <PushCreateWorkflow
        mediaIdQuery={createMediaQuery}
        onMediaQueryApplied={() => setTab("Waiting")}
        sourceContext="push"
      />
      {routePrefillReason ? <p className="feedback_text feedback_error">{routePrefillReason}</p> : null}

      {settleFeedback && tab === "Live Matches" ? <p className={`feedback_text feedback_${settleFeedback.type}`}>{settleFeedback.message}</p> : null}

      {tab === "Waiting" ? (
        waitingSectionLoading ? (
          <LoadingState
            variant="section"
            label="Loading waiting pushes"
            copy="Open waiting pushes are loading from chain."
          />
        ) : (
          <div className="compact_card_grid compact_card_grid_waiting">
            {openWaitingPushes.map((push) => (
              <WaitingPushCard
                key={push.id}
                push={push}
                challengeDisabledReason={
                  normalizedWalletAddress && normalizeAddress(push.pusherAddress) === normalizedWalletAddress
                    ? "You cannot challenge your own push."
                    : null
                }
                onChallenge={() => openChallenge(push.id)}
              />
            ))}
          </div>
        )
      ) : activeMatchesSectionLoading ? (
        <LoadingState
          variant="section"
          label="Loading live matches"
          copy="Active matches are loading from chain."
        />
      ) : (
        <div className="compact_card_grid compact_card_grid_matches">
          {activeMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onSettle={match.status === "active" ? () => settleMatch(match.id) : undefined}
            />
          ))}
        </div>
      )}

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
        open={modalOpen}
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
