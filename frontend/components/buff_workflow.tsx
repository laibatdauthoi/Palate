"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { BuffPanel } from "@/components/buff_panel";
import { ModalShell } from "@/components/modal_shell";
import { useCountdownNow, getLiveCountdownState } from "@/hooks/use_live_countdown";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { canonicalizeAptosAddress, formatOctasToApt, parseAptToOctas } from "@/services/aptos_service";
import type { ActiveMatch } from "@/types/palate";
import { logUiPerf } from "@/utils/ui_perf";

const live_refresh_interval_ms = 18000;

type BuffWorkflowProps =
  | {
      presentation?: "inline";
      sourceContext?: string;
    }
  | {
      presentation: "modal";
      open: boolean;
      onClose: () => void;
      sourceContext?: string;
    };

export function BuffWorkflow(props: BuffWorkflowProps) {
  const presentation = props.presentation ?? "inline";
  const sourceContext = props.sourceContext ?? (presentation === "modal" ? "home-buff" : "buff");
  const modalOpen = presentation === "modal" ? props.open : false;
  const closeModal = presentation === "modal" ? props.onClose : null;
  const {
    balance,
    activeMatches,
    chainRead,
    currentAssignment,
    feedback,
    findMatch,
    noValidMatchAvailable,
    palateBalanceReadStatus,
    placeBuff,
    processingAction,
    publicGameReadStatus,
    readLifecycle,
    refreshPublicGameState,
    settleMatch,
    skipMatch,
    userBuffRecords,
    walletReadCache
  } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const [buffAmount, setBuffAmount] = useState("0.250");
  const [selectedSide, setSelectedSide] = useState<"A" | "B" | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [showLocalNoValidMatchFeedback, setShowLocalNoValidMatchFeedback] = useState(false);
  const nowMs = useCountdownNow();
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const assignmentOwnedByCurrentWallet = walletReadCache.currentAssignment.ownerAddress === normalizedWalletAddress;
  const assignmentHasCurrentWalletData = assignmentOwnedByCurrentWallet && walletReadCache.currentAssignment.lastSuccessfulReadAt !== null;
  const currentWalletAssignment = assignmentOwnedByCurrentWallet ? currentAssignment : null;
  const assignedMatch = currentWalletAssignment?.match;
  const assignedMatchCountdown = assignedMatch
    ? getLiveCountdownState(Number(assignedMatch.endTimeSeconds), nowMs, { endedLabel: "Ended" })
    : null;
  const assignedMatchEnded = assignedMatch
    ? assignedMatch.status === "settled" || assignedMatchCountdown?.isEnded === true
    : false;
  const buffBusy = processingAction === "findMatch" || processingAction === "placeBuff" || processingAction === "skipMatch";
  const isPlacingBuff = processingAction === "placeBuff";
  const isSkippingMatch = processingAction === "skipMatch";
  const isSettlingMatch = processingAction === "settleMatch";
  const walletReady = walletStatus === "connected";
  const minBuffOctas = chainRead.protocolConfig?.minBuffAmount ? BigInt(chainRead.protocolConfig.minBuffAmount) : null;
  const minBuffAmountLabel = minBuffOctas !== null ? formatOctasToApt(minBuffOctas) : "loading";
  const buffAmountValidation = validateBuffAmount(buffAmount, minBuffOctas);
  const availableBalanceOctas = parseAmountOctas(balance.availableBalance);
  const buffAmountOctas = parseAmountOctas(buffAmount);
  const isBalanceUnavailable = palateBalanceReadStatus === "loading" || palateBalanceReadStatus === "error";
  const buffBalanceValid = buffAmountValidation.valid && buffAmountOctas !== null && availableBalanceOctas !== null
    ? buffAmountOctas <= availableBalanceOctas
    : false;
  const confirmButtonLabel = isPlacingBuff
    ? "Submitting"
    : !selectedSide
      ? "Select a side"
      : !buffAmountValidation.valid
        ? "Amount too low"
        : isBalanceUnavailable
          ? "Balance unavailable"
          : !buffBalanceValid
            ? "Insufficient Balance"
            : `Confirm Buff ${selectedSide}`;
  const confirmDisabledReason = !walletReady
    ? "Connect wallet to place a Buff."
    : assignedMatchEnded
      ? "Match ended."
      : !selectedSide
        ? "Select a side."
        : palateBalanceReadStatus === "loading"
          ? "Palate balance is still loading."
          : palateBalanceReadStatus === "error"
            ? "Palate balance unavailable."
            : !buffAmountValidation.valid
              ? `Minimum Buff: ${minBuffAmountLabel}`
              : !buffBalanceValid
                ? "Insufficient Palate balance for this Buff."
                : isPlacingBuff
                  ? "Buff submission in progress."
                  : isSkippingMatch
                    ? "Skip Match in progress."
                    : null;
  const canBuff = confirmDisabledReason === null;
  const buffFeedback = feedback?.scope === "buff" ? feedback : null;
  const findMatchFeedback = buffFeedback && isFindMatchFeedbackMessage(buffFeedback.message) ? buffFeedback : null;
  const assignmentFeedback = buffFeedback && !findMatchFeedback ? buffFeedback : null;
  const isAssignmentZoneUnresolved = walletReady && (
    (!readLifecycle.hasLoadedPublicGameState && (publicGameReadStatus === "idle" || publicGameReadStatus === "loading"))
    || !assignmentHasCurrentWalletData
  );
  const canFindMatch = walletReady && !buffBusy && !isAssignmentZoneUnresolved;
  const buffedMatchIds = useMemo(
    () => new Set(
      userBuffRecords
        .filter((record) => !record.claimed)
        .map((record) => normalizeMatchId(record.matchId))
    ),
    [userBuffRecords]
  );
  const eligibleMatchCandidates = useMemo(
    () => activeMatches.filter((match) => getFindMatchBlockReason(match, {
      buffedMatchIds,
      normalizedWalletAddress,
      nowMs
    }) === null),
    [activeMatches, buffedMatchIds, normalizedWalletAddress, nowMs]
  );
  const showNoValidMatchStatus = !assignedMatch
    && !isAssignmentZoneUnresolved
    && eligibleMatchCandidates.length === 0
    && (showLocalNoValidMatchFeedback || noValidMatchAvailable || findMatchFeedback?.message.toLowerCase().includes("no valid match") === true);
  const findMatchLabel = processingAction === "findMatch"
    ? "Finding"
    : isAssignmentZoneUnresolved
      ? "Loading matches"
      : showNoValidMatchStatus
        ? "No valid match available"
        : findMatchFeedback?.message ?? "Find Match";
  const findMatchLabelStateClassName = processingAction === "findMatch"
    ? "buff_find_match_label_loading"
    : isAssignmentZoneUnresolved
      ? "buff_find_match_label_loading"
      : showNoValidMatchStatus
        ? "buff_find_match_label_error"
        : findMatchFeedback
          ? `buff_find_match_label_${findMatchFeedback.type}`
          : "";
  const assignmentBannerCopy = assignedMatchEnded
    ? "Assignment ended. Open it to settle or clear it before finding another match."
    : "Assignment active. Open it to Buff or Skip before finding another match.";
  const showAssignmentBanner = presentation === "inline" && Boolean(assignedMatch && assignmentOwnedByCurrentWallet);
  const showAssignedWorkflow = Boolean(
    assignedMatch
    && currentWalletAssignment
    && assignmentOwnedByCurrentWallet
    && (presentation === "modal" || assignmentModalOpen)
  );

  useEffect(() => {
    setSelectedSide(null);
  }, [assignedMatch?.id]);

  useEffect(() => {
    if (presentation === "modal") {
      if (!modalOpen) {
        setShowLocalNoValidMatchFeedback(false);
      }
      return;
    }

    if (assignedMatch) {
      setShowLocalNoValidMatchFeedback(false);
      setAssignmentModalOpen(true);
      return;
    }

    setAssignmentModalOpen(false);
  }, [assignedMatch, modalOpen, presentation]);

  useEffect(() => {
    if (eligibleMatchCandidates.length > 0 || isAssignmentZoneUnresolved || assignedMatch) {
      setShowLocalNoValidMatchFeedback(false);
    }
  }, [assignedMatch, eligibleMatchCandidates.length, isAssignmentZoneUnresolved]);

  useEffect(() => {
    if (presentation === "modal" && !modalOpen) {
      return;
    }

    async function runRefresh(source: "interval" | "visible" | "mount") {
      if (document.hidden) {
        logUiPerf("liveRefresh:skippedHidden", { page: sourceContext, source });
        return;
      }

      await refreshPublicGameState({
        activeMatches: true,
        assignment: walletReady,
        ownerAddress: walletAddress ?? null,
        source: `${sourceContext}:${source}`
      });
    }

    if (!readLifecycle.hasLoadedPublicGameState || publicGameReadStatus === "idle") {
      void runRefresh("mount");
    }

    const intervalId = window.setInterval(() => {
      void runRefresh("interval");
    }, live_refresh_interval_ms);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void runRefresh("visible");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    modalOpen,
    presentation,
    publicGameReadStatus,
    readLifecycle.hasLoadedPublicGameState,
    refreshPublicGameState,
    sourceContext,
    walletAddress,
    walletReady
  ]);

  function handleFindMatchClick() {
    if (buffBusy) {
      return;
    }

    if (assignedMatch) {
      setShowLocalNoValidMatchFeedback(false);
      if (presentation === "inline") {
        setAssignmentModalOpen(true);
      }
      return;
    }

    if (isAssignmentZoneUnresolved) {
      return;
    }

    if (eligibleMatchCandidates.length === 0) {
      setShowLocalNoValidMatchFeedback(true);
      return;
    }

    setShowLocalNoValidMatchFeedback(false);
    void findMatch();
  }

  const workflowLauncher = (
    <div className="buff_cta_block">
      <div className="buff_status_stack">
        <div className="buff_cta_row">
          <div className="buff_find_match_control">
            <button
              aria-label="Find Match"
              className="buff_find_match_search_button"
              disabled={!canFindMatch}
              onClick={handleFindMatchClick}
              title="Find Match"
              type="button"
            >
              <svg aria-hidden="true" className="buff_find_match_search_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
            <span className={`buff_find_match_label ${findMatchLabelStateClassName}`.trim()} aria-live="polite">
              {findMatchLabel}
            </span>
          </div>
        </div>
        {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to find a match and place Buffs.</p> : null}
      </div>
    </div>
  );

  const assignedWorkflowPanel = assignedMatch && currentWalletAssignment ? (
    <div className="buff_assignment_modal_content">
      <BuffPanel
        buffAmount={buffAmount}
        confirmLabel={confirmButtonLabel}
        confirmDisabled={!canBuff}
        confirmLoading={isPlacingBuff}
        confirmTooltip={confirmDisabledReason}
        disableSkip={!walletReady}
        ended={assignedMatchEnded}
        endedLabel={assignedMatch.status === "settled" ? "Match settled" : "Match ended"}
        match={assignedMatch}
        minBuffAmountLabel={minBuffAmountLabel}
        onBuffAmountChange={setBuffAmount}
        onConfirmBuff={() => {
          if (assignedMatchEnded || !selectedSide) {
            return;
          }
          void placeBuff(selectedSide, buffAmount);
        }}
        onSelectSide={setSelectedSide}
        onSettle={assignedMatch.status === "settled" ? undefined : () => settleMatch(assignedMatch.id)}
        onSkip={skipMatch}
        selectedSide={selectedSide}
        settleDisabled={!walletReady || isSettlingMatch || assignedMatch.status === "settled"}
        settleLoading={isSettlingMatch}
        skipLoading={isSkippingMatch}
        skipPenalty={currentWalletAssignment.skipPenaltyAmount}
      />
    </div>
  ) : null;

  if (presentation === "modal") {
    return (
      <ModalShell
        onClose={closeModal!}
        open={modalOpen}
        subtitle={
          showAssignedWorkflow
            ? "Live score and Buff direction stay hidden until settlement."
            : "Find a random eligible match, then Buff one side or skip it."
        }
        title={showAssignedWorkflow ? "Assigned Match" : "Buff Random Match"}
      >
        {showAssignedWorkflow ? assignedWorkflowPanel : workflowLauncher}
      </ModalShell>
    );
  }

  return (
    <>
      {workflowLauncher}

      {showAssignmentBanner ? (
        <div className="buff_assignment_banner surface_card card_shell">
          <p className="secondary_text">{assignmentBannerCopy}</p>
          <div className="buff_assignment_banner_actions card_actions">
            <ActionButton className="buff_assignment_reopen_button" onClick={() => setAssignmentModalOpen(true)}>
              Open Assignment
            </ActionButton>
          </div>
          {assignmentFeedback ? <p className={`feedback_text feedback_${assignmentFeedback.type}`}>{assignmentFeedback.message}</p> : null}
        </div>
      ) : null}

      {assignedMatch && assignmentOwnedByCurrentWallet ? (
        <ModalShell
          onClose={() => setAssignmentModalOpen(false)}
          open={assignmentModalOpen}
          subtitle="Live score and Buff direction stay hidden until settlement."
          title="Assigned Match"
        >
          {assignedWorkflowPanel}
        </ModalShell>
      ) : null}
    </>
  );
}

function isFindMatchFeedbackMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  return normalized.includes("find match")
    || normalized.includes("match assigned")
    || normalized.includes("complete or skip")
    || normalized.includes("no valid match")
    || normalized.includes("request rejected")
    || normalized.includes("rejected the request");
}

function validateBuffAmount(value: string, minimumOctas: bigint | null) {
  if (minimumOctas === null) {
    return { valid: false, message: "Minimum Buff: loading" };
  }

  const minimumText = formatOctasToApt(minimumOctas);

  try {
    const parsed = BigInt(parseAptToOctas(value));
    if (parsed < minimumOctas) {
      return { valid: false, message: `Minimum Buff is ${minimumText}` };
    }

    return { valid: true, message: `Minimum Buff: ${minimumText}` };
  } catch {
    return { valid: false, message: `Minimum Buff is ${minimumText}` };
  }
}

function parseAmountOctas(value: string) {
  try {
    return BigInt(parseAptToOctas(value));
  } catch {
    return null;
  }
}

function normalizeMatchId(matchId: number | string) {
  return String(matchId);
}

function normalizeAddress(address: string | null | undefined) {
  return canonicalizeAptosAddress(address);
}

function isMatchEnded(match: ActiveMatch, nowMs: number) {
  return getLiveCountdownState(Number(match.endTimeSeconds), nowMs, { endedLabel: "Ended" }).isEnded;
}

function isMatchSettled(match: ActiveMatch) {
  return match.status === "settled";
}

function isSameAptosAddress(a: string | null | undefined, b: string | null | undefined) {
  const normalizedA = normalizeAddress(a);
  const normalizedB = normalizeAddress(b);
  return normalizedA !== null && normalizedB !== null && normalizedA === normalizedB;
}

function getFindMatchBlockReason(
  match: ActiveMatch,
  input: {
    buffedMatchIds: Set<string>;
    normalizedWalletAddress: string | null;
    nowMs: number;
  }
) {
  if (match.status !== "active") {
    return "match_not_active";
  }

  if (isMatchEnded(match, input.nowMs) || isMatchSettled(match)) {
    return "match_unavailable";
  }

  if (input.buffedMatchIds.has(normalizeMatchId(match.id))) {
    return "already_buffed";
  }

  if (!input.normalizedWalletAddress) {
    return null;
  }

  if (
    isSameAptosAddress(match.pusherA, input.normalizedWalletAddress)
    || isSameAptosAddress(match.pusherB, input.normalizedWalletAddress)
    || isSameAptosAddress(match.mediaA.ownerAddress, input.normalizedWalletAddress)
    || isSameAptosAddress(match.mediaB.ownerAddress, input.normalizedWalletAddress)
  ) {
    return "self_owned_match";
  }

  return null;
}
