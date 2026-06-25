"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { BuffPanel } from "@/components/buff_panel";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
import { LoadingState } from "@/components/loading_state";
import { MatchCard } from "@/components/match_card";
import { ModalShell } from "@/components/modal_shell";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { useCountdownNow, getLiveCountdownState } from "@/hooks/use_live_countdown";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { formatOctasToApt, parseAptToOctas } from "@/services/aptos_service";
import { logPageMount, logUiPerf } from "@/utils/ui_perf";

const live_refresh_interval_ms = 18000;

export default function BuffPage() {
  const {
    completedBuffSide,
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
    skipMatch
  } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const [buffAmount, setBuffAmount] = useState("0.250");
  const [selectedSide, setSelectedSide] = useState<"A" | "B" | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
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
  const settleableMatches = activeMatches.filter((match) =>
    match.status === "active" && getLiveCountdownState(Number(match.endTimeSeconds), nowMs, { endedLabel: "Ready to settle" }).isEnded
  );
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
  const canFindMatch = walletReady && !buffBusy && !currentAssignment;
  const buffPageLoading = publicGameReadStatus === "loading" && !readLifecycle.hasLoadedPublicGameState;

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
      <PageHeader
        eyebrow="Buff"
        title="Find one random match and Buff the side you believe in."
        copy="Choose one side, enter your Buff amount, and confirm before finding another match."
        variant="floating"
        density="compact"
        stacked
        lifted
      />

      {buffPageLoading ? (
        <LoadingState
          variant="section"
          label="Loading Buff state"
          copy="Active matches and your current assignment are loading from chain."
        />
      ) : assignedMatch ? (
        <div className="buff_assignment_banner surface_card card_shell">
          <p className="secondary_text">Assignment active. Open it to Buff or Skip before finding another match.</p>
          <div className="buff_assignment_banner_actions card_actions">
            <ActionButton className="buff_assignment_reopen_button" onClick={() => setAssignmentModalOpen(true)}>
              Open Assignment
            </ActionButton>
            <ActionButton className="buff_assignment_find_button" onClick={() => setAssignmentModalOpen(true)} variant="secondary">
              Find Match
            </ActionButton>
          </div>
          {completedBuffSide ? <p className="feedback_text feedback_success">Buff {completedBuffSide} recorded. Find the next match when you are ready.</p> : null}
          {buffFeedback ? <p className={`feedback_text feedback_${buffFeedback.type}`}>{buffFeedback.message}</p> : null}
        </div>
      ) : (
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
                <span className="buff_find_match_label" aria-live="polite">
                  {processingAction === "findMatch" ? "Finding" : "Find Match"}
                </span>
              </div>
            </div>
            {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to find a match and place Buffs.</p> : null}
            {completedBuffSide ? <p className="feedback_text feedback_success">Buff {completedBuffSide} recorded. Find the next match when you are ready.</p> : null}
            {noValidMatchAvailable ? <ErrorState variant="section" title="No valid match available right now." copy="Try again after more live matches become eligible for Buff." /> : null}
            {buffFeedback ? <p className={`feedback_text feedback_${buffFeedback.type}`}>{buffFeedback.message}</p> : null}
          </div>
        </div>
      )}

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

      <SectionPanel title="Settle eligible matches">
        {settleFeedback ? <p className={`feedback_text feedback_${settleFeedback.type}`}>{settleFeedback.message}</p> : null}
        {buffPageLoading ? (
          <LoadingState
            variant="section"
            label="Loading settleable matches"
            copy="Match settlement eligibility is loading from chain."
          />
        ) : settleableMatches.length > 0 ? (
          <div className="compact_card_grid compact_card_grid_matches">
            {settleableMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                settleDisabled={!walletReady || processingAction === "settleMatch"}
                onSettle={() => settleMatch(match.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState variant="section" title="No match ready to settle" copy="Settling becomes available after the match end time passes." />
        )}
      </SectionPanel>
    </div>
  );
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
