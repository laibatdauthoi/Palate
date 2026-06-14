"use client";

import { useState } from "react";
import { ActionButton } from "@/components/action_button";
import { BuffPanel } from "@/components/buff_panel";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
import { LoadingState } from "@/components/loading_state";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { usePalate } from "@/providers/palate_provider";
import { formatOctasToApt, parseAptToOctas } from "@/services/aptos_service";

export default function BuffPage() {
  const {
    completedBuffSide,
    chainRead,
    currentAssignment,
    feedback,
    findMatch,
    noValidMatchAvailable,
    placeMockBuff,
    processingAction,
    skipMatch
  } = usePalate();
  const [buffAmount, setBuffAmount] = useState("0.250");
  const assignedMatch = currentAssignment?.match;
  const buffBusy = processingAction === "findMatch" || processingAction === "placeBuff" || processingAction === "skipMatch";
  const minBuffOctas = chainRead.protocolConfig?.minBuffAmount ? BigInt(chainRead.protocolConfig.minBuffAmount) : null;
  const minBuffAmountLabel = minBuffOctas !== null ? formatOctasToApt(minBuffOctas) : "loading";
  const buffAmountValidation = validateBuffAmount(buffAmount, minBuffOctas);

  return (
    <div className="page_stack page_buff">
      <PageHeader
        eyebrow="Buff"
        title="Receive one random match. Choose with conviction."
        copy="Users cannot manually choose a match to Buff. Existing assignments must be completed or skipped before finding another match."
        actions={<ActionButton disabled={buffBusy || Boolean(currentAssignment)} onClick={findMatch}>{processingAction === "findMatch" ? "Finding" : "Find Match"}</ActionButton>}
      />

      {feedback ? <div className={`state_card feedback_panel feedback_${feedback.type}`}><p>{feedback.message}</p></div> : null}

      {assignedMatch ? (
        <BuffPanel
          buffAmount={buffAmount}
          buffHelperText={buffAmountValidation.message}
          disableBuffActions={!buffAmountValidation.valid}
          loading={buffBusy}
          match={assignedMatch}
          minBuffAmountLabel={minBuffAmountLabel}
          onBuffA={() => placeMockBuff("A", buffAmount)}
          onBuffAmountChange={setBuffAmount}
          onBuffB={() => placeMockBuff("B", buffAmount)}
          onSkip={skipMatch}
          skipPenalty={currentAssignment.skipPenaltyAmount}
        />
      ) : null}

      <div className="panel_grid">
        <SectionPanel title="No assigned match">
          <div className="stack">
            <p className="secondary_text">Find Match assigns one active valid match. Manual match selection is not available.</p>
            <ActionButton disabled={buffBusy || Boolean(currentAssignment)} onClick={findMatch}>{processingAction === "findMatch" ? "Finding" : "Find Match"}</ActionButton>
          </div>
        </SectionPanel>
        <SectionPanel title="Buff completed">
          <div className="stack">
            <p className="secondary_text">
              {completedBuffSide ? `Buff ${completedBuffSide} is recorded. The result remains pending until the match settles.` : "After a Buff, the completed state appears here."}
            </p>
            <ActionButton disabled={buffBusy || Boolean(currentAssignment)} onClick={findMatch}>{processingAction === "findMatch" ? "Finding" : "Find Next Match"}</ActionButton>
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
