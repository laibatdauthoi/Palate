import type { ActiveMatch } from "@/types/palate";
import { ActionButton } from "./action_button";
import { BuffDecisionCard } from "./buff_decision_card";
import { CategoryBadge } from "./category_badge";
import { CountdownTimer } from "./countdown_timer";

type BuffPanelProps = {
  match: ActiveMatch;
  skipPenalty: string;
  buffAmount: string;
  selectedSide: "A" | "B" | null;
  minBuffAmountLabel?: string;
  ended?: boolean;
  endedLabel?: string;
  onBuffAmountChange: (value: string) => void;
  onSelectSide: (side: "A" | "B") => void;
  onConfirmBuff: () => void;
  onSkip: () => void;
  onSettle?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  confirmTooltip?: string | null;
  confirmLoading?: boolean;
  skipTooltip?: string | null;
  skipLoading?: boolean;
  disableSkip?: boolean;
  settleDisabled?: boolean;
  settleLoading?: boolean;
};

export function BuffPanel({
  match,
  skipPenalty,
  buffAmount,
  selectedSide,
  minBuffAmountLabel = "0.1 APT",
  ended = false,
  endedLabel = "Match ended",
  onBuffAmountChange,
  onSelectSide,
  onConfirmBuff,
  onSkip,
  onSettle,
  confirmLabel,
  confirmDisabled = false,
  confirmTooltip = null,
  confirmLoading = false,
  skipTooltip = null,
  skipLoading = false,
  disableSkip = false,
  settleDisabled = false,
  settleLoading = false
}: BuffPanelProps) {
  const resolvedSkipTooltip = skipTooltip ?? `Skip penalty: ${skipPenalty}`;
  const resolvedConfirmLabel = confirmLabel ?? (confirmLoading
    ? "Submitting"
    : selectedSide
      ? `Confirm Buff ${selectedSide}`
      : "Select a side");

  return (
    <section className="buff_panel">
      <div className="buff_vs_layout">
        <BuffDecisionCard disabledSelection={ended} media={match.mediaA} onSelect={() => onSelectSide("A")} selected={selectedSide === "A"} side="A" />
        <div className="buff_vs_core">
          <CategoryBadge category={match.category} />
          <span className="buff_vs_token">VS</span>
          <CountdownTimer endedLabel="Ended" targetTimestamp={match.endTimeSeconds} />
        </div>
        <BuffDecisionCard disabledSelection={ended} media={match.mediaB} onSelect={() => onSelectSide("B")} selected={selectedSide === "B"} side="B" />
      </div>
      <div className="buff_action_bar">
        {ended ? (
          <div className="buff_ended_state">
            <div className="buff_ended_copy">
              <strong>{endedLabel}</strong>
              <p>This match can no longer receive Buffs.</p>
            </div>
            {onSettle ? (
              <ActionButton className="buff_confirm_button" disabled={settleDisabled} onClick={onSettle}>
                {settleLoading ? "Settling" : "Settle Match"}
              </ActionButton>
            ) : null}
          </div>
        ) : (
          <div className="buff_action_row">
            <div className="buff_amount_input_wrap">
              <input
                className="input_control buff_amount_input"
                aria-label="Buff amount"
                id="buff_amount_input"
                inputMode="decimal"
                onChange={(event) => onBuffAmountChange(event.target.value)}
                placeholder={minBuffAmountLabel}
                value={buffAmount}
              />
              <span aria-hidden="true" className="buff_amount_suffix">APT</span>
            </div>
            <span
              className="buff_tooltip_anchor"
              data-tooltip={confirmTooltip ?? undefined}
              tabIndex={confirmTooltip ? 0 : -1}
            >
              <ActionButton className="buff_confirm_button" disabled={confirmDisabled} onClick={onConfirmBuff}>
                {resolvedConfirmLabel}
              </ActionButton>
            </span>
            <span className="buff_tooltip_anchor buff_skip_stack" data-tooltip={resolvedSkipTooltip}>
              <ActionButton className="skip_match_button" disabled={skipLoading || disableSkip} onClick={onSkip} variant="caution">
                {skipLoading ? "Skipping" : "Skip Match"}
              </ActionButton>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
