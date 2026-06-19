"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { BuffPanel } from "@/components/buff_panel";
import { EmptyState } from "@/components/empty_state";
import { LoadingState } from "@/components/loading_state";
import { MatchCard } from "@/components/match_card";
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
  const nowMs = useCountdownNow();
  const assignedMatch = currentAssignment?.match;
  const buffBusy = processingAction === "findMatch" || processingAction === "placeBuff" || processingAction === "skipMatch";
  const walletReady = walletStatus === "connected";
  const settleableMatches = activeMatches.filter((match) =>
    match.status === "active" && getLiveCountdownState(Number(match.endTimeSeconds), nowMs, { endedLabel: "Ready to settle" }).isEnded
  );
  const minBuffOctas = chainRead.protocolConfig?.minBuffAmount ? BigInt(chainRead.protocolConfig.minBuffAmount) : null;
  const minBuffAmountLabel = minBuffOctas !== null ? formatOctasToApt(minBuffOctas) : "loading";
  const buffAmountValidation = validateBuffAmount(buffAmount, minBuffOctas);
  const availableBalanceOctas = parseAmountOctas(balance.availableBalance);
  const buffAmountOctas = parseAmountOctas(buffAmount);
  const buffBalanceValid = buffAmountValidation.valid && buffAmountOctas !== null && availableBalanceOctas !== null
    ? buffAmountOctas <= availableBalanceOctas
    : false;
  const buffHelperText = !buffAmountValidation.valid
    ? buffAmountValidation.message
    : !buffBalanceValid
      ? "Palate Balance is too low for this Buff."
      : buffAmountValidation.message;
  const canBuff = walletReady && !buffBusy && buffAmountValidation.valid && buffBalanceValid;
  const buffFeedback = feedback?.scope === "buff" ? feedback : null;
  const settleFeedback = feedback?.scope === "settle" ? feedback : null;
  const canFindMatch = walletReady && !buffBusy && !currentAssignment;
  const buffPageLoading = publicGameReadStatus === "loading" && !readLifecycle.hasLoadedPublicGameState;

  useEffect(() => {
    logPageMount("Buff");
  }, []);

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
        copy="Manual match selection stays disabled. Finish or skip your current assignment before finding the next one."
      />

      {buffPageLoading ? (
        <LoadingState
          label="Loading Buff state"
          copy="Active matches and your current assignment are loading from chain."
        />
      ) : (
        <div className="buff_cta_block">
          <div className="buff_status_stack">
            <div className="buff_cta_row">
              <ActionButton
                className="buff_find_match_cta buff_find_match_cta_wide"
                disabled={!canFindMatch}
                onClick={findMatch}
              >
                {processingAction === "findMatch" ? "Finding" : "Find Match"}
              </ActionButton>
            </div>
            {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to find a match and place Buffs.</p> : null}
            {currentAssignment ? <p className="secondary_text">Assignment active. Buff or skip it before finding another match.</p> : null}
            {completedBuffSide ? <p className="feedback_text feedback_success">Buff {completedBuffSide} recorded. Find the next match when you are ready.</p> : null}
            {noValidMatchAvailable ? <p className="feedback_text feedback_error">No valid match available right now.</p> : null}
            {buffFeedback ? <p className={`feedback_text feedback_${buffFeedback.type}`}>{buffFeedback.message}</p> : null}
          </div>
        </div>
      )}

      {assignedMatch ? (
        <BuffPanel
          buffAmount={buffAmount}
          buffHelperText={buffHelperText}
          disableBuffActions={!canBuff}
          loading={buffBusy}
          match={assignedMatch}
          minBuffAmountLabel={minBuffAmountLabel}
          disableSkip={!walletReady}
          onBuffA={() => placeBuff("A", buffAmount)}
          onBuffAmountChange={setBuffAmount}
          onBuffB={() => placeBuff("B", buffAmount)}
          onSkip={skipMatch}
          skipPenalty={currentAssignment.skipPenaltyAmount}
        />
      ) : null}

      <SectionPanel title="Settle eligible matches">
        {settleFeedback ? <p className={`feedback_text feedback_${settleFeedback.type}`}>{settleFeedback.message}</p> : null}
        {buffPageLoading ? (
          <LoadingState
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
          <EmptyState title="No match ready to settle" copy="Settling becomes available after the match end time passes." />
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
