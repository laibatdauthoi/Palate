import type { WaitingPush } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { StatusBadge } from "./status_badge";

type WaitingPushCardProps = {
  push: WaitingPush;
  onChallenge?: () => void;
};

export function WaitingPushCard({ push, onChallenge }: WaitingPushCardProps) {
  return (
    <article className="waiting_push_card">
      <div className={`waiting_media media_preview_${push.media.accent}`}>
        <span>{push.media.title}</span>
      </div>
      <div className="waiting_push_body">
        <div className="spread">
          <h3>{push.media.title}</h3>
          <StatusBadge status="open" />
        </div>
        <div className="cluster">
          <CategoryBadge category={push.media.category} />
          <FormatBadge format={push.media.format} />
        </div>
        <dl className="details_grid">
          <div>
            <dt>Pusher</dt>
            <dd>{push.pusherAddress}</dd>
          </div>
          <div>
            <dt>Push amount</dt>
            <dd>{push.pushAmount}</dd>
          </div>
          <div>
            <dt>Minimum challenge</dt>
            <dd>{push.minChallengeAmount}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{push.createdTime}</dd>
          </div>
        </dl>
        <ActionButton onClick={onChallenge}>Challenge</ActionButton>
      </div>
    </article>
  );
}
