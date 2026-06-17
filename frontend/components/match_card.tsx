import type { ActiveMatch } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { CountdownTimer } from "./countdown_timer";
import { useLiveCountdown } from "@/hooks/use_live_countdown";
import { MediaRenderer } from "./media_renderer";
import { StatusBadge } from "./status_badge";

type MatchCardProps = {
  match: ActiveMatch;
  actionHref?: string;
  onSettle?: () => void;
  settleDisabled?: boolean;
};

export function MatchCard({ match, actionHref, onSettle, settleDisabled }: MatchCardProps) {
  const countdown = useLiveCountdown(Number(match.endTimeSeconds), { endedLabel: "Ready to settle" });
  const isSettleEligible = match.status === "active" && countdown.isEnded;
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
        <div className="cluster">
          <CategoryBadge category={match.category} />
          <StatusBadge status={match.status} />
        </div>
        <div className="spread">
          <CountdownTimer endedLabel="Ready to settle" targetTimestamp={match.endTimeSeconds} />
          <div className="match_card_actions">
            {onSettle && isSettleEligible ? (
              <ActionButton disabled={settleDisabled} onClick={onSettle} variant="secondary">
                Settle
              </ActionButton>
            ) : null}
            <ActionButton href={actionHref ?? "/buff"} variant="secondary">View</ActionButton>
          </div>
        </div>
        <p className="mock_note">Live score, Buff pool, leading side, odds, and win probability are intentionally hidden.</p>
      </div>
    </article>
  );
}
