import type { ActiveMatch } from "@/types/palate";
import { ActionButton } from "./action_button";
import { AmountInput } from "./amount_input";
import { BuffDecisionCard } from "./buff_decision_card";
import { CategoryBadge } from "./category_badge";
import { CountdownTimer } from "./countdown_timer";

type BuffPanelProps = {
  match: ActiveMatch;
  skipPenalty: string;
  buffAmount: string;
  minBuffAmountLabel?: string;
  buffHelperText?: string;
  disableBuffActions?: boolean;
  onBuffAmountChange: (value: string) => void;
  onBuffA: () => void;
  onBuffB: () => void;
  onSkip: () => void;
  loading?: boolean;
  disableSkip?: boolean;
};

export function BuffPanel({
  match,
  skipPenalty,
  buffAmount,
  minBuffAmountLabel = "0.1 APT",
  buffHelperText,
  disableBuffActions = false,
  onBuffAmountChange,
  onBuffA,
  onBuffB,
  onSkip,
  loading = false,
  disableSkip = false
}: BuffPanelProps) {
  return (
    <section className="buff_panel">
      <div className="buff_panel_top">
        <div>
          <span className="eyebrow">Assigned Match</span>
          <h2>Choose the side that deserves to win.</h2>
        </div>
        <div className="cluster">
          <CategoryBadge category={match.category} />
          <CountdownTimer endedLabel="Ready to settle" targetTimestamp={match.endTimeSeconds} />
        </div>
      </div>
      <div className="buff_vs_layout">
        <BuffDecisionCard side="A" media={match.mediaA} />
        <div className="buff_vs_core">
          <span>VS</span>
          <p>Live score and Buff direction are hidden until settlement.</p>
        </div>
        <BuffDecisionCard side="B" media={match.mediaB} />
      </div>
      <div className="buff_action_bar">
        <div className="amount_field_stack">
          <AmountInput label="Buff amount" onChange={onBuffAmountChange} placeholder={`Minimum ${minBuffAmountLabel}`} value={buffAmount} />
          {buffHelperText ? <p className={`amount_helper ${disableBuffActions ? "amount_helper_error" : ""}`}>{buffHelperText}</p> : null}
        </div>
        <div className="buff_action_buttons">
          <ActionButton className="buff_choice_button" disabled={loading || disableBuffActions} onClick={onBuffA}>{loading ? "Submitting" : "Buff A"}</ActionButton>
          <ActionButton className="buff_choice_button" disabled={loading || disableBuffActions} onClick={onBuffB}>{loading ? "Submitting" : "Buff B"}</ActionButton>
          <ActionButton className="skip_match_button" disabled={loading || disableSkip} onClick={onSkip} variant="danger">{loading ? "Skipping" : "Skip Match"}</ActionButton>
        </div>
        <p className="danger_note">Skip Match penalty: {skipPenalty}. Skipping clears this assignment.</p>
      </div>
    </section>
  );
}
