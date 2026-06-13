import type { ClaimRecord } from "@/types/palate";
import { ActionButton } from "./action_button";
import { StatusBadge } from "./status_badge";

export function ClaimCard({ claim }: { claim: ClaimRecord }) {
  return (
    <article className="claim_card">
      <div>
        <span className="eyebrow">{claim.type} Rewards</span>
        <h3>{claim.matchRef}</h3>
        <p>{claim.settledTime}</p>
      </div>
      <div className="claim_amount">
        <strong>{claim.amount}</strong>
        <StatusBadge status={claim.claimable ? "claimable" : "pending"} />
      </div>
      <ActionButton variant={claim.claimable ? "primary" : "secondary"} disabled={!claim.claimable}>
        Claim
      </ActionButton>
    </article>
  );
}
