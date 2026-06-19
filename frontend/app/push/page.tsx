"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/action_button";
import { AmountInput } from "@/components/amount_input";
import { ChallengeFlowModal } from "@/components/challenge_flow_modal";
import { CustomDropdown, type DropdownOption } from "@/components/custom_dropdown";
import { MatchCard } from "@/components/match_card";
import { LoadingState } from "@/components/loading_state";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { WaitingPushCard } from "@/components/waiting_push_card";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { formatOctasToApt, parseAptToOctas } from "@/services/aptos_service";
import type { MediaCategory } from "@/types/palate";
import { getMediaDisplayTitle } from "@/utils/media_display";
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
  const { activeMatches, balance, challengePush, chainRead, clearFeedback, createPush, feedback, mediaReadStatus, mediaRecords, processingAction, publicGameReadStatus, readLifecycle, refreshPublicGameState, settleMatch, waitingPushes } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"Waiting" | "Live Matches">("Waiting");
  const [modalOpen, setModalOpen] = useState(false);
  const [createMediaId, setCreateMediaId] = useState("");
  const [createAmount, setCreateAmount] = useState("1.000");
  const [challengePushId, setChallengePushId] = useState<number | null>(null);
  const [challengeMediaId, setChallengeMediaId] = useState("");
  const [challengeAmount, setChallengeAmount] = useState("6.510");
  const [prefillReason, setPrefillReason] = useState<string | null>(null);
  const [dismissedChallengeId, setDismissedChallengeId] = useState<number | null>(null);
  const [lastAppliedCreateMediaQuery, setLastAppliedCreateMediaQuery] = useState<string | null>(null);
  const [lastAppliedChallengeQuery, setLastAppliedChallengeQuery] = useState<string | null>(null);
  const createMediaQuery = searchParams.get("mediaId");
  const challengePushQuery = searchParams.get("challengeId") ?? searchParams.get("pushId");
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
  const challengeOptions = selectedPush ? pushableMedia.filter((media) => media.category === selectedPush.media.category) : pushableMedia;
  const selectedPushCategoryLabel = selectedPush ? category_labels[selectedPush.media.category].toUpperCase() : "MEDIA";
  const pushFeedback = feedback?.scope === "push" ? feedback : null;
  const challengeFeedback = feedback?.scope === "challenge" ? feedback : null;
  const settleFeedback = feedback?.scope === "settle" ? feedback : null;
  const pushBusy = processingAction === "createPush" || processingAction === "challengePush";
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
  const createAmountValidation = validateAmount(createAmount, minPushOctas, "Minimum Push");
  const challengeAmountValidation = validateAmount(challengeAmount, effectiveChallengeOctas, "Minimum challenge");
  const availableBalanceOctas = parseAmountOctas(balance.availableBalance);
  const createAmountOctas = parseAmountOctas(createAmount);
  const challengeAmountOctas = parseAmountOctas(challengeAmount);
  const createBalanceValid = createAmountOctas !== null && availableBalanceOctas !== null && createAmountOctas <= availableBalanceOctas;
  const challengeBalanceValid = challengeAmountOctas !== null && availableBalanceOctas !== null && challengeAmountOctas <= availableBalanceOctas;
  const createAmountHelperText = !createAmountValidation.valid
    ? createAmountValidation.message
    : !createBalanceValid
      ? "Not enough Palate Balance."
      : createAmountValidation.message;
  const challengeAmountHelperText = !challengeAmountValidation.valid
    ? challengeAmountValidation.message
    : !challengeBalanceValid
      ? "Not enough Palate Balance."
      : challengeAmountValidation.message;
  const canCreatePush = walletReady && !pushBusy && Boolean(createMediaId) && createAmountValidation.valid && createBalanceValid;
  const createPushLoading = walletReady && mediaReadStatus === "loading" && !readLifecycle.hasLoadedMedia;
  const waitingSectionLoading = publicGameReadStatus === "loading" && !readLifecycle.hasLoadedPublicGameState;
  const activeMatchesSectionLoading = publicGameReadStatus === "loading" && !readLifecycle.hasLoadedPublicGameState;
  const idleMediaOptions: DropdownOption<string>[] = [
    { label: "Select idle media", value: "" },
    ...pushableMedia.map((media) => ({
      label: `${getMediaDisplayTitle(media)} - ${category_labels[media.category]}`,
      value: String(media.id)
    }))
  ];
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
        source: `push:${source}`
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
    if (!createMediaQuery) {
      setLastAppliedCreateMediaQuery(null);
      return;
    }

    if (createMediaQuery === lastAppliedCreateMediaQuery) {
      return;
    }

    const nextId = Number(createMediaQuery);
    if (Number.isNaN(nextId)) {
      setLastAppliedCreateMediaQuery(createMediaQuery);
      return;
    }

    const candidate = mediaRecords.find((item) => item.id === nextId);
    if (!candidate) {
      setCreateMediaId("");
      setPrefillReason("Selected media is no longer available.");
      setLastAppliedCreateMediaQuery(createMediaQuery);
      return;
    }

    const eligibility = getPushEligibility(candidate, { allowExpiredWaitingPush: true });
    if (eligibility.eligible) {
      setCreateMediaId(String(candidate.id));
      setPrefillReason(null);
      setTab("Waiting");
      setLastAppliedCreateMediaQuery(createMediaQuery);
      return;
    }

    setCreateMediaId("");
    setPrefillReason(eligibility.reason);
    setTab("Waiting");
    setLastAppliedCreateMediaQuery(createMediaQuery);
  }, [createMediaQuery, lastAppliedCreateMediaQuery, mediaRecords]);

  useEffect(() => {
    if (!createMediaId) {
      return;
    }

    const candidate = mediaRecords.find((item) => String(item.id) === createMediaId);
    if (!candidate) {
      setCreateMediaId("");
      setPrefillReason("Selected media is no longer available.");
      return;
    }

    const eligibility = getPushEligibility(candidate, { allowExpiredWaitingPush: true });
    if (!eligibility.eligible) {
      setCreateMediaId("");
      setPrefillReason(eligibility.reason);
    }
  }, [createMediaId, mediaRecords]);

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
      setPrefillReason("Selected waiting push is no longer available.");
      setChallengePushId(null);
      setChallengeMediaId("");
      setModalOpen(false);
      clearChallengeQuery();
      setLastAppliedChallengeQuery(challengePushQuery);
      return;
    }

    setChallengePushId(nextId);
    setChallengeAmount(push.minChallengeAmount.replace(" APT", ""));
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

    setPrefillReason("Selected waiting push is no longer available.");
    setChallengePushId(null);
    setChallengeMediaId("");
    setModalOpen(false);
    clearChallengeQuery();
  }, [challengePushId, clearChallengeQuery, clearFeedback, modalOpen, selectedPush]);

  function openChallenge(pushId: number) {
    const startedAt = uiPerfNow();
    const push = openWaitingPushes.find((candidate) => candidate.id === pushId);
    if (!push) {
      setPrefillReason("Selected waiting push is no longer available.");
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
      setPrefillReason("You cannot challenge your own push.");
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
    setPrefillReason(null);
    setLastAppliedChallengeQuery(String(pushId));
    setChallengePushId(pushId);
    setChallengeAmount(push?.minChallengeAmount.replace(" APT", "") ?? "1.000");
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
        title: getMediaDisplayTitle(media),
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
      />

      <SectionPanel>
        <div className="tabs">
          {(["Waiting", "Live Matches"] as const).map((item) => (
            <button
              className={`tab_button ${tab === item ? "active" : ""}`}
              key={item}
              onClick={() => {
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
            >
              {item}
            </button>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel title="Create push" copy="Use Palate Balance and mark selected idle media as waiting for a challenger.">
        {createPushLoading ? (
          <LoadingState
            label="Loading push inventory"
            copy="Idle media and protocol minimums are loading from chain."
          />
        ) : (
          <div className="mock_form_grid">
            <CustomDropdown label="Idle media" onChange={setCreateMediaId} options={idleMediaOptions} value={createMediaId} />
            <div className="amount_field_stack">
              <AmountInput label="Push amount" onChange={setCreateAmount} placeholder={`Minimum ${minPushLabel}`} value={createAmount} />
              <p className={`amount_helper ${createAmountValidation.valid && createBalanceValid ? "" : "amount_helper_error"}`}>
                {createAmountHelperText}
              </p>
            </div>
            <ActionButton disabled={pushBusy || !canCreatePush} onClick={() => createPush(Number(createMediaId), createAmount)}>
              {processingAction === "createPush" ? "Creating" : "Create Push"}
            </ActionButton>
          </div>
        )}
        {prefillReason ? <p className="feedback_text feedback_error">{prefillReason}</p> : null}
        {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to create or challenge Pushes on Aptos Testnet.</p> : null}
        {pushFeedback ? <p className={`feedback_text feedback_${pushFeedback.type}`}>{pushFeedback.message}</p> : null}
      </SectionPanel>

      {settleFeedback && tab === "Live Matches" ? <p className={`feedback_text feedback_${settleFeedback.type}`}>{settleFeedback.message}</p> : null}

      {tab === "Waiting" ? (
        waitingSectionLoading ? (
          <LoadingState
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
        challengeAmount={challengeAmount}
        challengeAmountHelperText={challengeAmountHelperText}
        challengeAmountValid={challengeAmountValidation.valid}
        challengeBalanceValid={challengeBalanceValid}
        challengeFeedback={challengeFeedback}
        challengeOptions={challengeOptions}
        onBackToMedia={() => {
          setChallengeMediaId("");
          clearFeedback();
        }}
        onChallengeAmountChange={setChallengeAmount}
        onClose={closeChallengeModal}
        onSelectMedia={(mediaId) => {
          setChallengeMediaId(mediaId);
          clearFeedback();
        }}
        onSubmit={() => {
          if (!selectedPush || selectedPushIsOwned) return;
          challengePush(selectedPush.id, Number(challengeMediaId), challengeAmount);
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

function validateAmount(value: string, minimumOctas: bigint | null, label: string) {
  if (minimumOctas === null) {
    return { valid: false, message: `${label}: loading` };
  }

  const minimumText = formatOctasToApt(minimumOctas);

  try {
    const parsed = BigInt(parseAptToOctas(value));
    if (parsed < minimumOctas) {
      return { valid: false, message: `${label} is ${minimumText}` };
    }

    return { valid: true, message: `${label}: ${minimumText}` };
  } catch {
    return { valid: false, message: `${label} is ${minimumText}` };
  }
}

function parseAmountOctas(value: string) {
  try {
    return BigInt(parseAptToOctas(value, { allowZero: true }));
  } catch {
    return null;
  }
}
