import type { ActiveMatch } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { CountdownTimer } from "./countdown_timer";
import { MediaRenderer } from "./media_renderer";
import { StatusBadge } from "./status_badge";

export function MatchCard({ match }: { match: ActiveMatch }) {
  return (
    <article className="match_card">
      <div className="match_media_pair">
        <div className={`mini_media media_preview_${match.mediaA.accent}`}>
          <span className="mini_side_label">Media A</span>
          <MediaRenderer compact media={match.mediaA} />
        </div>
        <div className="vs_marker">VS</div>
        <div className={`mini_media media_preview_${match.mediaB.accent}`}>
          <span className="mini_side_label">Media B</span>
          <MediaRenderer compact media={match.mediaB} />
        </div>
      </div>
      <div className="match_card_body">
        <div className="cluster">
          <CategoryBadge category={match.category} />
          <StatusBadge status={match.status} />
        </div>
        <div className="spread">
          <CountdownTimer value={match.timeRemaining} />
          <ActionButton variant="secondary">View</ActionButton>
        </div>
        <p className="mock_note">Live score, Buff pool, leading side, odds, and win probability are intentionally hidden.</p>
      </div>
    </article>
  );
}
