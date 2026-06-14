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
  onBuffAmountChange: (value: string) => void;
  onBuffA: () => void;
  onBuffB: () => void;
  onSkip: () => void;
  loading?: boolean;
};

export function BuffPanel({ match, skipPenalty, buffAmount, minBuffAmountLabel = "0.1 APT", onBuffAmountChange, onBuffA, onBuffB, onSkip, loading = false }: BuffPanelProps) {
  return (
    <section className="buff_panel">
      <div className="buff_panel_top">
        <div>
          <span className="eyebrow">Assigned Match</span>
          <h2>Choose the side that deserves to win.</h2>
        </div>
        <div className="cluster">
          <CategoryBadge category={match.category} />
          <CountdownTimer value={match.timeRemaining} />
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
        <AmountInput label="Buff amount" onChange={onBuffAmountChange} placeholder={`Minimum ${minBuffAmountLabel}`} value={buffAmount} />
        <div className="buff_action_buttons">
          <ActionButton className="buff_choice_button" disabled={loading} onClick={onBuffA}>{loading ? "Submitting" : "Buff A"}</ActionButton>
          <ActionButton className="buff_choice_button" disabled={loading} onClick={onBuffB}>{loading ? "Submitting" : "Buff B"}</ActionButton>
          <ActionButton className="skip_match_button" disabled={loading} onClick={onSkip} variant="danger">{loading ? "Skipping" : "Skip Match"}</ActionButton>
        </div>
        <p className="danger_note">Skip Match penalty: {skipPenalty}. Skipping clears this assignment.</p>
      </div>
    </section>
  );
}
