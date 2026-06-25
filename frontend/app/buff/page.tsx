"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { BuffPanel } from "@/components/buff_panel";
import { ClaimCard } from "@/components/claim_card";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
import { FilterBar } from "@/components/filter_bar";
import { LoadingState } from "@/components/loading_state";
import { MatchCard } from "@/components/match_card";
import { ModalShell } from "@/components/modal_shell";
import { useCountdownNow, getLiveCountdownState } from "@/hooks/use_live_countdown";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { formatOctasToApt, parseAptToOctas } from "@/services/aptos_service";
import { logPageMount, logUiPerf } from "@/utils/ui_perf";

const live_refresh_interval_ms = 18000;
type MyBuffFilter = "all" | "pending" | "ready";

export default function BuffPage() {
  const {
    completedBuffSide,
    balance,
    activeMatches,
    chainRead,
    claimReadStatus,
    claimReward,
    claimRecords,
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
    skipMatch
  } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const [buffAmount, setBuffAmount] = useState("0.250");
  const [selectedSide, setSelectedSide] = useState<"A" | "B" | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [myBuffFilter, setMyBuffFilter] = useState<MyBuffFilter>("all");
  const nowMs = useCountdownNow();
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
  const buffPageLoading = publicGameReadStatus === "loading" && !readLifecycle.hasLoadedPublicGameState;
  const canFindMatch = walletReady && !buffBusy && !buffPageLoading;
  const findMatchLabel = processingAction === "findMatch"
    ? "Finding"
    : findMatchFeedback?.message ?? "Find Match";
  const findMatchLabelStateClassName = processingAction === "findMatch"
    ? "buff_find_match_label_loading"
    : findMatchFeedback
      ? `buff_find_match_label_${findMatchFeedback.type}`
      : "";
  const assignmentFeedback = buffFeedback && !findMatchFeedback ? buffFeedback : null;
  const activeMatchesById = useMemo(() => new Map(activeMatches.map((match) => [match.id, match])), [activeMatches]);
  const myBuffEntries = useMemo(() => {
    return claimRecords
      .filter((claim) => claim.type === "buff" && !claim.claimed)
      .map((claim) => {
        const match = typeof claim.matchId === "number" ? activeMatchesById.get(claim.matchId) ?? null : null;
        const readyByCountdown = match
          ? getLiveCountdownState(Number(match.endTimeSeconds), nowMs, { endedLabel: "Ready to settle" }).isEnded
          : false;
        const readyToSettle = claim.settled || claim.claimable || readyByCountdown;

        return {
          claim,
          match,
          readyToSettle
        };
      });
  }, [activeMatchesById, claimRecords, nowMs]);
  const myBuffCounts = useMemo(() => {
    const pending = myBuffEntries.filter((entry) => !entry.readyToSettle).length;
    const ready = myBuffEntries.filter((entry) => entry.readyToSettle).length;

    return {
      all: myBuffEntries.length,
      pending,
      ready
    };
  }, [myBuffEntries]);
  const filteredMyBuffEntries = useMemo(() => {
    if (myBuffFilter === "pending") {
      return myBuffEntries.filter((entry) => !entry.readyToSettle);
    }

    if (myBuffFilter === "ready") {
      return myBuffEntries.filter((entry) => entry.readyToSettle);
    }

    return myBuffEntries;
  }, [myBuffEntries, myBuffFilter]);
  const myBuffsLoading = walletReady && (
    (claimReadStatus === "loading" && !readLifecycle.hasLoadedClaims)
    || (publicGameReadStatus === "loading" && !readLifecycle.hasLoadedPublicGameState)
  );
  const myBuffsError = walletReady && claimReadStatus === "error" && myBuffEntries.length === 0 && !myBuffsLoading;
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
      setAssignmentModalOpen(true);
      return;
    }

    setAssignmentModalOpen(false);
  }, [assignedMatch]);

  useEffect(() => {
    function runRefresh(source: "interval" | "visible" | "mount") {
      if (document.hidden) {
        logUiPerf("liveRefresh:skippedHidden", { page: "buff", source });
        return;
      }

      void refreshPublicGameState({
        activeMatches: true,
        assignment: walletReady,
        ownerAddress: walletAddress ?? null,
        source: `buff:${source}`
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
  }, [refreshPublicGameState, walletAddress, walletReady]);

  return (
    <div className="page_stack page_buff">
      <div className="buff_page_label page_label_lifted">
        <span className="eyebrow">My Buffs</span>
      </div>

      {buffPageLoading ? (
        <LoadingState
          variant="section"
          label="Loading Buff state"
          copy="Active matches and your current assignment are loading from chain."
        />
      ) : null}

      <div className="buff_cta_block">
        <div className="buff_status_stack">
          <div className="buff_cta_row">
            <div className="buff_find_match_control">
              <button
                aria-label="Find Match"
                className="buff_find_match_search_button"
                disabled={!canFindMatch}
                onClick={() => {
                  if (assignedMatch) {
                    setAssignmentModalOpen(true);
                    return;
                  }
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
          {completedBuffSide ? <p className="feedback_text feedback_success">Buff {completedBuffSide} recorded. Find the next match when you are ready.</p> : null}
          {noValidMatchAvailable ? <ErrorState variant="section" title="No valid match available right now." copy="Try again after more live matches become eligible for Buff." /> : null}
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
        {myBuffsLoading ? (
          <LoadingState
            variant="section"
            label="Loading My Buffs"
            copy="Your Buff records and live match settlement state are loading from chain."
          />
        ) : myBuffsError ? (
          <ErrorState
            variant="section"
            title="My Buffs unavailable"
            copy="Buff records are temporarily unavailable while the chain read is retried."
          />
        ) : filteredMyBuffEntries.length > 0 ? (
          <div className="buff_results_stack">
            {filteredMyBuffEntries.some((entry) => entry.match) ? (
              <div className="compact_card_grid compact_card_grid_matches buff_matches_grid">
                {filteredMyBuffEntries
                  .filter((entry) => entry.match)
                  .map((entry) => (
                    <MatchCard
                      key={`match-${entry.claim.claimKey}`}
                      match={entry.match!}
                      settleDisabled={!walletReady || processingAction === "settleMatch" || !entry.readyToSettle}
                      onSettle={entry.readyToSettle ? () => settleMatch(entry.match!.id) : undefined}
                    />
                  ))}
              </div>
            ) : null}

            {filteredMyBuffEntries.some((entry) => !entry.match) ? (
              <div className="claim_rows buff_claim_rows">
                {filteredMyBuffEntries
                  .filter((entry) => !entry.match)
                  .map((entry) => (
                    <ClaimCard
                      actionDisabled={!walletReady}
                      claim={entry.claim}
                      key={`claim-${entry.claim.claimKey}`}
                      loading={processingAction === "claimReward"}
                      onClaim={entry.claim.claimable ? () => claimReward(entry.claim) : undefined}
                    />
                  ))}
              </div>
            ) : null}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

function isFindMatchFeedbackMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  return normalized.includes("find match")
    || normalized.includes("match assigned")
    || normalized.includes("complete or skip")
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
