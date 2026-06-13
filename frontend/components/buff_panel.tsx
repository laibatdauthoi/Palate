import type { MockMatch } from "@/data/mock_data";
import { ActionButton } from "./action_button";
import { AmountInput } from "./amount_input";
import { BuffDecisionCard } from "./buff_decision_card";
import { CategoryBadge } from "./category_badge";
import { CountdownTimer } from "./countdown_timer";

type BuffPanelProps = {
  match: MockMatch;
  skipPenalty: string;
};

export function BuffPanel({ match, skipPenalty }: BuffPanelProps) {
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
        <AmountInput label="Buff amount" placeholder="0.10 APT minimum" />
        <div className="buff_action_buttons">
          <ActionButton>Buff A</ActionButton>
          <ActionButton>Buff B</ActionButton>
          <ActionButton variant="danger">Skip Match</ActionButton>
        </div>
        <p className="danger_note">Skip Match penalty: {skipPenalty}. Skipping clears this assignment.</p>
      </div>
    </section>
  );
}
