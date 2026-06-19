import type { WaitingPush } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { MediaRenderer } from "./media_renderer";
import { StatusBadge } from "./status_badge";
import { getMediaDisplayTitle } from "@/utils/media_display";

type WaitingPushCardProps = {
  push: WaitingPush;
  onChallenge?: () => void;
  challengeHref?: string;
  challengeDisabledReason?: string | null;
};

function shortenAddress(address: string) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WaitingPushCard({ push, onChallenge, challengeHref, challengeDisabledReason }: WaitingPushCardProps) {
  const displayTitle = getMediaDisplayTitle(push.media);
  const canChallenge = push.status === "open" && !challengeDisabledReason && Boolean(challengeHref || onChallenge);
  return (
    <article className="waiting_push_card">
      <div className={`waiting_media media_preview_${push.media.accent}`}>
        <MediaRenderer media={push.media} variant="compact" />
      </div>
      <div className="waiting_push_body">
        <div className="waiting_push_header">
          <div className="waiting_push_title_group">
            <h3>{displayTitle}</h3>
            <div className="cluster">
              <CategoryBadge category={push.media.category} />
              <FormatBadge format={push.media.format} />
            </div>
          </div>
          <StatusBadge status={push.status === "open" ? "open" : push.status === "challenged" ? "active" : "disabled"} />
        </div>
        <div className="waiting_push_meta">
          <dl className="waiting_push_stats">
            <div className="waiting_push_stat">
              <dt>Push amount</dt>
              <dd>{push.pushAmount}</dd>
            </div>
            <div className="waiting_push_stat">
              <dt>Min challenge</dt>
              <dd>{push.minChallengeAmount}</dd>
            </div>
          </dl>
          <dl className="waiting_push_details">
            <div className="waiting_push_detail_row">
              <div className="waiting_push_detail_stack">
                <div className="waiting_push_detail_line">
                  <dt>Pusher</dt>
                  <dd>{shortenAddress(push.pusherAddress)}</dd>
                </div>
                <div className="waiting_push_detail_line">
                  <dt>Created</dt>
                  <dd>{push.createdTime}</dd>
                </div>
              </div>
              <div className="waiting_push_action_stack">
                <div className="waiting_push_actions">
                  {challengeHref && canChallenge ? (
                    <ActionButton href={challengeHref} variant="primary">Challenge</ActionButton>
                  ) : (
                    <ActionButton disabled={!canChallenge} onClick={canChallenge ? onChallenge : undefined} variant="primary">{push.status === "open" ? "Challenge" : "Closed"}</ActionButton>
                  )}
                </div>
                {challengeDisabledReason ? <p className="waiting_push_reason">{challengeDisabledReason}</p> : null}
              </div>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}
