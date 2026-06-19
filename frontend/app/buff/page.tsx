"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { BuffPanel } from "@/components/buff_panel";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
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
        title="Receive one random match. Choose with conviction."
        copy="Users cannot manually choose a match to Buff. Existing assignments must be completed or skipped before finding another match."
        actions={<ActionButton disabled={!walletReady || buffBusy || Boolean(currentAssignment)} onClick={findMatch}>{processingAction === "findMatch" ? "Finding" : "Find Match"}</ActionButton>}
      />

      {buffFeedback ? <div className={`state_card feedback_panel feedback_${buffFeedback.type}`}><p>{buffFeedback.message}</p></div> : null}

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

      <SectionPanel title="Settle eligible matches" copy="Only expired active matches can be settled. Hidden live score, pools, and odds remain hidden until settlement completes.">
        {settleFeedback ? <p className={`feedback_text feedback_${settleFeedback.type}`}>{settleFeedback.message}</p> : null}
        {settleableMatches.length > 0 ? (
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

      <div className="panel_grid">
        <SectionPanel title="No assigned match">
          <div className="stack">
            <p className="secondary_text">Find Match assigns one active valid match. Manual match selection is not available.</p>
            <ActionButton disabled={!walletReady || buffBusy || Boolean(currentAssignment)} onClick={findMatch}>{processingAction === "findMatch" ? "Finding" : "Find Match"}</ActionButton>
          </div>
        </SectionPanel>
        <SectionPanel title="Buff completed">
          <div className="stack">
            <p className="secondary_text">
              {completedBuffSide ? `Buff ${completedBuffSide} is recorded. The result remains pending until the match settles.` : "After a Buff, the completed state appears here."}
            </p>
            <ActionButton disabled={!walletReady || buffBusy || Boolean(currentAssignment)} onClick={findMatch}>{processingAction === "findMatch" ? "Finding" : "Find Next Match"}</ActionButton>
          </div>
        </SectionPanel>
        {noValidMatchAvailable ? (
          <EmptyState
            title="No active match available right now."
            copy="Try again later or push your own media into a match."
            actionLabel="Go to Push"
            actionHref="/push"
          />
        ) : (
          <SectionPanel title="No valid match state">
            <p className="secondary_text">Use Find Match after all matches have been Buffed to reach this state.</p>
          </SectionPanel>
        )}
      </div>

      <div className="wide_two_column">
        <LoadingState label="Finding match" />
        <ErrorState title="No valid match available" copy="Every active match is expired, already Buffed, or not valid for this wallet." />
      </div>
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
