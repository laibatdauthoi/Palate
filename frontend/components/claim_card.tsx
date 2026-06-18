import { useMemo, useState } from "react";
import type { ClaimRecord } from "@/types/palate";
import { ActionButton } from "./action_button";
import { StatusBadge } from "./status_badge";

export function ClaimCard({ claim, onClaim, loading, actionDisabled }: { claim: ClaimRecord; onClaim?: () => void; loading?: boolean; actionDisabled?: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const unavailable = !claim.settled || claim.claimed || !claim.claimable || BigInt(claim.claimableAmountOctas) <= BigInt(0);
  const disabled = actionDisabled || unavailable || loading;
  const buttonLabel = loading ? "Claiming..." : claim.claimed ? "Claimed" : BigInt(claim.claimableAmountOctas) <= BigInt(0) ? "Unavailable" : "Claim";
  const shortMatchId = useMemo(() => {
    if (typeof claim.matchId === "number") {
      return `#${claim.matchId}`;
    }

    return claim.matchRef.length > 18 ? `${claim.matchRef.slice(0, 18)}...` : claim.matchRef;
  }, [claim.matchId, claim.matchRef]);
  const rewardLabel = claim.type === "buff" ? "Buff" : "Push";
  const status = claim.claimed ? "claimed" : claim.claimable ? "claimable" : "pending";

  return (
    <article className="claim_card">
      <div className="claim_row_main">
        <div className="claim_row_identity">
          <span className="eyebrow">{rewardLabel}</span>
          <h3>{shortMatchId}</h3>
        </div>
        <p>{claim.settledTime}</p>
      </div>
      <div className="claim_amount">
        <strong>{claim.amount}</strong>
        <StatusBadge status={status} />
      </div>
      <div className="claim_row_actions">
        <button
          className="claim_detail_toggle"
          onClick={() => setDetailsOpen((current) => !current)}
          type="button"
        >
          {detailsOpen ? "Hide details" : "Details"}
        </button>
        <ActionButton onClick={onClaim} variant={claim.claimable && !claim.claimed && BigInt(claim.claimableAmountOctas) > BigInt(0) ? "primary" : "secondary"} disabled={disabled}>
          {buttonLabel}
        </ActionButton>
      </div>
      {detailsOpen ? (
        <div className="claim_row_details">
          <div className="claim_detail_item">
            <span>Match</span>
            <strong>{typeof claim.matchId === "number" ? `#${claim.matchId}` : claim.matchRef}</strong>
          </div>
          <div className="claim_detail_item">
            <span>Claim key</span>
            <strong>{claim.claimKey}</strong>
          </div>
          <div className="claim_detail_item">
            <span>Reward type</span>
            <strong>{rewardLabel}</strong>
          </div>
          <div className="claim_detail_item">
            <span>Settled</span>
            <strong>{claim.settled ? "Yes" : "No"}</strong>
          </div>
        </div>
      ) : null}
    </article>
  );
}
