import type { ActiveMatch } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { useLiveCountdown } from "@/hooks/use_live_countdown";
import { MediaRenderer } from "./media_renderer";
import { StatusBadge } from "./status_badge";
import { logUiPerf, uiPerfNow } from "@/utils/ui_perf";

type MatchCardProps = {
  match: ActiveMatch;
  onSettle?: () => void;
  settleDisabled?: boolean;
};

export function MatchCard({ match, onSettle, settleDisabled }: MatchCardProps) {
  const countdown = useLiveCountdown(Number(match.endTimeSeconds), { endedLabel: "Settlement available" });
  const isSettleEligible = match.status === "active" && countdown.isEnded;
  const displayStatus = isSettleEligible ? "ended" : "live";
  const footerStatusText = isSettleEligible ? "Settlement available" : null;

  return (
    <article className="match_card">
      <div className="match_media_pair">
        <div className={`mini_media media_preview_${match.mediaA.accent}`}>
          <span className="mini_side_label">Media A</span>
          <MediaRenderer compact media={match.mediaA} variant="match" />
        </div>
        <div className="vs_marker">VS</div>
        <div className={`mini_media media_preview_${match.mediaB.accent}`}>
          <span className="mini_side_label">Media B</span>
          <MediaRenderer compact media={match.mediaB} variant="match" />
        </div>
      </div>
      <div className="match_card_body">
        <div className="match_card_meta_row">
          <div className="cluster">
            <CategoryBadge category={match.category} />
            <StatusBadge status={displayStatus} />
          </div>
          {footerStatusText ? <span className="match_card_status_text">{footerStatusText}</span> : null}
        </div>
        <div className="match_card_actions">
          {isSettleEligible && onSettle ? (
            <ActionButton
              disabled={settleDisabled}
              onClick={() => {
                const startedAt = uiPerfNow();
                logUiPerf("settleButtonClick", {
                  matchId: match.id,
                  status: match.status,
                  readyToSettle: isSettleEligible,
                  localStateUpdatedImmediately: false,
                  providerAction: "settleMatch"
                });
                onSettle();
                logUiPerf("settleButtonClick:end", {
                  matchId: match.id,
                  syncDurationMs: Math.round(uiPerfNow() - startedAt)
                });
              }}
            >
              Settle
            </ActionButton>
          ) : (
            <span className="countdown_timer match_card_countdown_slot">{countdown.label}</span>
          )}
        </div>
      </div>
    </article>
  );
}
