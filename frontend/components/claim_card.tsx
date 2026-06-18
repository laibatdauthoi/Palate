import type { ClaimRecord } from "@/types/palate";
import { ActionButton } from "./action_button";
import { StatusBadge } from "./status_badge";

export function ClaimCard({ claim, onClaim, loading, actionDisabled }: { claim: ClaimRecord; onClaim?: () => void; loading?: boolean; actionDisabled?: boolean }) {
  const unavailable = !claim.settled || claim.claimed || !claim.claimable || BigInt(claim.claimableAmountOctas) <= BigInt(0);
  const disabled = actionDisabled || unavailable || loading;
  const buttonLabel = loading ? "Claiming" : claim.claimed ? "Claimed" : BigInt(claim.claimableAmountOctas) <= BigInt(0) ? "Unavailable" : "Claim";

  return (
    <article className="claim_card">
      <div>
        <span className="eyebrow">{claim.type === "buff" ? "Buff" : "Push"} Rewards</span>
        <h3>{claim.matchRef}</h3>
        <p>{claim.settledTime}</p>
      </div>
      <div className="claim_amount">
        <strong>{claim.amount}</strong>
        <StatusBadge status={claim.claimed ? "claimed" : claim.claimable ? "claimable" : "pending"} />
      </div>
      <ActionButton onClick={onClaim} variant={claim.claimable && !claim.claimed && BigInt(claim.claimableAmountOctas) > BigInt(0) ? "primary" : "secondary"} disabled={disabled}>
        {buttonLabel}
      </ActionButton>
    </article>
  );
}
