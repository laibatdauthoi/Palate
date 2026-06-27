"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { BuffPanel } from "@/components/buff_panel";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
import { FilterBar } from "@/components/filter_bar";
import { LoadingState } from "@/components/loading_state";
import { MatchCard } from "@/components/match_card";
import { ModalShell } from "@/components/modal_shell";
import { useCountdownNow, getLiveCountdownState } from "@/hooks/use_live_countdown";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { canonicalizeAptosAddress, formatOctasToApt, parseAptToOctas } from "@/services/aptos_service";
import type { ActiveMatch, UserBuffRecord } from "@/types/palate";
import { logPageMount, logUiPerf } from "@/utils/ui_perf";

const live_refresh_interval_ms = 18000;
type MyBuffFilter = "all" | "pending" | "ready";

export default function BuffPage() {
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
    userBuffReadStatus,
    userBuffRecords
  } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const [buffAmount, setBuffAmount] = useState("0.250");
  const [selectedSide, setSelectedSide] = useState<"A" | "B" | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [myBuffFilter, setMyBuffFilter] = useState<MyBuffFilter>("all");
  const [showLocalNoValidMatchFeedback, setShowLocalNoValidMatchFeedback] = useState(false);
  const nowMs = useCountdownNow();
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const assignedMatch = currentAssignment?.match;
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
  const isAmountBelowMinimum = !buffAmountValidation.valid;
  const isBalanceUnavailable = palateBalanceReadStatus === "loading" || palateBalanceReadStatus === "error";
  const buffBalanceValid = buffAmountValidation.valid && buffAmountOctas !== null && availableBalanceOctas !== null
    ? buffAmountOctas <= availableBalanceOctas
    : false;
  const isInsufficientBalance = buffAmountValidation.valid && !isBalanceUnavailable && !buffBalanceValid;
  const confirmButtonLabel = isPlacingBuff
    ? "Submitting"
    : !selectedSide
      ? "Select a side"
      : isAmountBelowMinimum
        ? "Amount too low"
        : isBalanceUnavailable
          ? "Balance unavailable"
          : isInsufficientBalance
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
  const settleFeedback = feedback?.scope === "settle" ? feedback : null;
  const findMatchFeedback = buffFeedback && isFindMatchFeedbackMessage(buffFeedback.message) ? buffFeedback : null;
  const isAssignmentZoneUnresolved = !readLifecycle.hasLoadedPublicGameState && (publicGameReadStatus === "idle" || publicGameReadStatus === "loading");
  const canFindMatch = walletReady && !buffBusy && !isAssignmentZoneUnresolved;
  const activeMatchesById = useMemo(() => new Map(activeMatches.map((match) => [normalizeMatchId(match.id), match])), [activeMatches]);
  const myBuffEntries = useMemo(() => {
    return userBuffRecords
      .filter((record) => !record.claimed)
      .map((record) => {
        const normalizedMatchId = normalizeMatchId(record.matchId);
        const match = activeMatchesById.get(normalizedMatchId) ?? null;
        const status = classifyBuffEntry(record, match, nowMs);

        return {
          matchId: normalizedMatchId,
          buffRecord: record,
          match,
          status
        };
      });
  }, [activeMatchesById, nowMs, userBuffRecords]);
  const buffedMatchIds = useMemo(
    () => new Set(myBuffEntries.map((entry) => entry.matchId)),
    [myBuffEntries]
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
  const assignmentFeedback = buffFeedback && !findMatchFeedback ? buffFeedback : null;
  const pendingBuffEntries = useMemo(
    () => myBuffEntries.filter((entry) => entry.status === "pending_result"),
    [myBuffEntries]
  );
  const readyToSettleBuffEntries = useMemo(
    () => myBuffEntries.filter((entry) => entry.status === "ready_to_settle"),
    [myBuffEntries]
  );
  const myBuffCounts = useMemo(() => {
    const pending = pendingBuffEntries.length;
    const ready = readyToSettleBuffEntries.length;

    return {
      all: pending + ready,
      pending,
      ready
    };
  }, [pendingBuffEntries.length, readyToSettleBuffEntries.length]);
  const filteredMyBuffEntries = useMemo(() => {
    if (myBuffFilter === "pending") {
      return pendingBuffEntries;
    }

    if (myBuffFilter === "ready") {
      return readyToSettleBuffEntries;
    }

    return myBuffEntries.filter((entry) => entry.status === "pending_result" || entry.status === "ready_to_settle");
  }, [myBuffEntries, myBuffFilter, pendingBuffEntries, readyToSettleBuffEntries]);
  const isUserBuffsResolved = !walletReady || (userBuffReadStatus !== "idle" && userBuffReadStatus !== "loading");
  const isUserBuffsUnresolved = walletReady && !isUserBuffsResolved;
  const isMyBuffPublicStateUnresolved = !readLifecycle.hasLoadedPublicGameState && (publicGameReadStatus === "idle" || publicGameReadStatus === "loading");
  const isMyBuffsDataUnresolved = isUserBuffsUnresolved || isMyBuffPublicStateUnresolved;
  const isMyBuffsLoading = isMyBuffsDataUnresolved;
  const isMyBuffsError = walletReady
    && !isMyBuffsLoading
    && (userBuffReadStatus === "error" || publicGameReadStatus === "error")
    && myBuffEntries.length === 0;
  const hasMyBuffRecords = filteredMyBuffEntries.length > 0;
  const canShowMyBuffsEmpty = !isMyBuffsLoading && !isMyBuffsError && !hasMyBuffRecords;
  const myBuffFilterItems = useMemo(() => ([
    { key: "all" as const, label: "All", count: myBuffCounts.all },
    { key: "pending" as const, label: "Pending Result", count: myBuffCounts.pending },
    { key: "ready" as const, label: "Ready to Settle", count: myBuffCounts.ready }
  ]), [myBuffCounts]);
  const assignmentBannerCopy = assignedMatchEnded
    ? "Assignment ended. Open it to settle or clear it before finding another match."
    : "Assignment active. Open it to Buff or Skip before finding another match.";

  useEffect(() => {
    logPageMount("Buff");
  }, []);

  useEffect(() => {
    setSelectedSide(null);
  }, [assignedMatch?.id]);

  useEffect(() => {
    if (assignedMatch) {
      setShowLocalNoValidMatchFeedback(false);
      setAssignmentModalOpen(true);
      return;
    }

    setAssignmentModalOpen(false);
  }, [assignedMatch]);

  useEffect(() => {
    if (eligibleMatchCandidates.length > 0 || isAssignmentZoneUnresolved || assignedMatch) {
      setShowLocalNoValidMatchFeedback(false);
    }
  }, [assignedMatch, eligibleMatchCandidates.length, isAssignmentZoneUnresolved]);

  useEffect(() => {
    async function runRefresh(source: "interval" | "visible" | "mount") {
      if (document.hidden) {
        logUiPerf("liveRefresh:skippedHidden", { page: "buff", source });
        return;
      }

      await refreshPublicGameState({
        activeMatches: true,
        assignment: walletReady,
        ownerAddress: walletAddress ?? null,
        source: `buff:${source}`
      });
    }

    if (!readLifecycle.hasLoadedPublicGameState || publicGameReadStatus === "idle") {
      void runRefresh("mount");
    }
    const intervalId = window.setInterval(() => runRefresh("interval"), live_refresh_interval_ms);
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
  }, [publicGameReadStatus, readLifecycle.hasLoadedPublicGameState, refreshPublicGameState, walletAddress, walletReady]);

  return (
    <div className="page_stack page_buff">
      <div className="buff_page_label page_label_lifted">
        <span className="eyebrow">My Buffs</span>
      </div>

      <div className="buff_cta_block">
        <div className="buff_status_stack">
          <div className="buff_cta_row">
            <div className="buff_find_match_control">
              <button
                aria-label="Find Match"
                className="buff_find_match_search_button"
                disabled={!canFindMatch}
                onClick={() => {
                  if (buffBusy) {
                    return;
                  }
                  if (assignedMatch) {
                    setShowLocalNoValidMatchFeedback(false);
                    setAssignmentModalOpen(true);
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
                  findMatch();
                }}
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

      {assignedMatch ? (
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

      {assignedMatch ? (
        <ModalShell
          onClose={() => setAssignmentModalOpen(false)}
          open={assignmentModalOpen}
          subtitle="Live score and Buff direction stay hidden until settlement."
          title="Assigned Match"
        >
          <div className="buff_assignment_modal_content">
            <BuffPanel
              buffAmount={buffAmount}
              confirmLabel={confirmButtonLabel}
              confirmDisabled={!canBuff}
              confirmLoading={isPlacingBuff}
              confirmTooltip={confirmDisabledReason}
              ended={assignedMatchEnded}
              endedLabel={assignedMatch?.status === "settled" ? "Match settled" : "Match ended"}
              match={assignedMatch}
              minBuffAmountLabel={minBuffAmountLabel}
              disableSkip={!walletReady}
              onBuffAmountChange={setBuffAmount}
              onConfirmBuff={() => {
                if (assignedMatchEnded) return;
                if (!selectedSide) return;
                placeBuff(selectedSide, buffAmount);
              }}
              onSettle={assignedMatch.status === "settled" ? undefined : () => settleMatch(assignedMatch.id)}
              onSkip={skipMatch}
              onSelectSide={setSelectedSide}
              selectedSide={selectedSide}
              settleDisabled={!walletReady || isSettlingMatch || assignedMatch.status === "settled"}
              settleLoading={isSettlingMatch}
              skipPenalty={currentAssignment.skipPenaltyAmount}
              skipLoading={isSkippingMatch}
            />
          </div>
        </ModalShell>
      ) : null}

      <div className="buff_my_buffs_stack">
        {settleFeedback ? <p className={`feedback_text feedback_${settleFeedback.type}`}>{settleFeedback.message}</p> : null}
        <FilterBar
          activeKey={myBuffFilter}
          ariaLabel="My Buffs filters"
          items={myBuffFilterItems}
          onChange={setMyBuffFilter}
        />
        {isMyBuffsError ? (
          <ErrorState
            variant="section"
            title="My Buffs unavailable"
            copy="Buff records are temporarily unavailable while the chain read is retried."
          />
        ) : isMyBuffsLoading ? (
          <LoadingState
            variant="section"
            label="Loading My Buffs"
            copy="Checking your Buff records."
          />
        ) : hasMyBuffRecords ? (
          <div className="buff_results_stack">
            {filteredMyBuffEntries.some((entry) => entry.match) ? (
              <div className="compact_card_grid compact_card_grid_matches buff_matches_grid">
                {filteredMyBuffEntries
                  .filter((entry) => entry.match)
                  .map((entry) => (
                    <MatchCard
                      key={`match-${entry.buffRecord.matchId}-${entry.buffRecord.side}`}
                      match={entry.match!}
                      settleDisabled={!walletReady || processingAction === "settleMatch" || entry.status !== "ready_to_settle"}
                      onSettle={entry.status === "ready_to_settle" ? () => settleMatch(entry.match!.id) : undefined}
                    />
                  ))}
              </div>
            ) : null}
          </div>
        ) : canShowMyBuffsEmpty ? (
          <EmptyState
            variant="section"
            title={
              myBuffFilter === "pending"
                ? "No pending results"
                : myBuffFilter === "ready"
                  ? "No matches ready to settle"
                  : "No Buffs yet"
            }
            copy={
              myBuffFilter === "pending"
                ? "Matches you have Buffed will stay here until the result is ready."
                : myBuffFilter === "ready"
                  ? "Matches become ready to settle after the end time passes."
              : "Find a match and Buff one side to start tracking it here."
            }
          />
        ) : null}
      </div>
    </div>
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

function classifyBuffEntry(record: UserBuffRecord, match: ActiveMatch | null, nowMs: number) {
  if (record.claimed || match === null || isMatchSettled(match)) {
    return "claimable_or_settled_excluded" as const;
  }

  if (isMatchEnded(match, nowMs)) {
    return "ready_to_settle" as const;
  }

  return "pending_result" as const;
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
