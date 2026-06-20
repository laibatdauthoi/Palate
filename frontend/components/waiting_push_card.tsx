import type { WaitingPush } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { MediaRenderer } from "./media_renderer";
import { StatusBadge } from "./status_badge";
import { useMediaPlayer } from "@/providers/media_player_provider";
import { getMediaDisplayTitle } from "@/utils/media_display";

type WaitingPushCardProps = {
  push: WaitingPush;
  onChallenge?: () => void;
  challengeHref?: string;
  challengeDisabledReason?: string | null;
  variant?: "default" | "compact";
};

function shortenAddress(address: string) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function WaitingAudioPreview({
  interactive,
  playing,
  onToggle,
  title
}: {
  interactive: boolean;
  playing: boolean;
  onToggle?: () => void;
  title: string;
}) {
  if (!interactive) {
    return (
      <div className="waiting_audio_preview waiting_audio_preview_static" aria-hidden="true">
        <div className="waiting_audio_icon_shell">
          <svg className="waiting_audio_icon" viewBox="0 0 64 64" fill="none">
            <path
              d="M18 34V31C18 23.268 24.268 17 32 17C39.732 17 46 23.268 46 31V34"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="15" y="31" width="9" height="18" rx="4.5" stroke="currentColor" strokeWidth="4.5" />
            <rect x="40" y="31" width="9" height="18" rx="4.5" stroke="currentColor" strokeWidth="4.5" />
            <path
              d="M24 46C24 49.314 26.686 52 30 52H34"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <button
      aria-label={`${playing ? "Pause" : "Play"} audio preview for ${title}`}
      className={`waiting_audio_preview waiting_audio_preview_button ${playing ? "active" : ""}`}
      onClick={onToggle}
      type="button"
    >
      <div className="waiting_audio_icon_shell">
        <svg className="waiting_audio_icon" viewBox="0 0 64 64" fill="none">
          <path
            d="M18 34V31C18 23.268 24.268 17 32 17C39.732 17 46 23.268 46 31V34"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="15"
            y="31"
            width="9"
            height="18"
            rx="4.5"
            stroke="currentColor"
            strokeWidth="4.5"
          />
          <rect
            x="40"
            y="31"
            width="9"
            height="18"
            rx="4.5"
            stroke="currentColor"
            strokeWidth="4.5"
          />
          <path
            d="M24 46C24 49.314 26.686 52 30 52H34"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </button>
  );
}

export function WaitingPushCard({
  push,
  onChallenge,
  challengeHref,
  challengeDisabledReason,
  variant = "default"
}: WaitingPushCardProps) {
  const { canPlayMedia, currentTrackId, isPlaying, playMedia, togglePlayback } = useMediaPlayer();
  const displayTitle = getMediaDisplayTitle(push.media);
  const canChallenge = push.status === "open" && !challengeDisabledReason && Boolean(challengeHref || onChallenge);
  const canPlayAudioPreview = push.media.category === "audio" && canPlayMedia(push.media);
  const audioPreviewActive = canPlayAudioPreview && currentTrackId === push.media.id;
  const isCompact = variant === "compact";
  const cardStatus = push.status === "open" ? "open" : push.status === "challenged" ? "active" : "disabled";
  const actionLabel = push.status === "open" ? "Challenge" : "Closed";
  return (
    <article className={`waiting_push_card waiting_push_card_${push.media.category} ${isCompact ? "waiting_push_card_compact" : ""}`}>
      <div className={`waiting_media media_preview_${push.media.accent}`}>
        {push.media.category === "audio" ? (
          <WaitingAudioPreview
            interactive={canPlayAudioPreview}
            onToggle={
              canPlayAudioPreview
                ? () => {
                    if (audioPreviewActive) {
                      togglePlayback();
                    } else {
                      playMedia(push.media);
                    }
                  }
                : undefined
            }
            playing={audioPreviewActive && isPlaying}
            title={displayTitle}
          />
        ) : (
          <MediaRenderer media={push.media} variant="compact" />
        )}
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
          <StatusBadge status={cardStatus} />
        </div>
        {isCompact ? (
          <div className="waiting_push_meta waiting_push_meta_compact">
            <dl className="waiting_push_stats waiting_push_stats_compact">
              <div className="waiting_push_stat">
                <dt>Required Amount</dt>
                <dd>{push.minChallengeAmount}</dd>
              </div>
            </dl>
            <div className="waiting_push_action_stack waiting_push_action_stack_compact">
              <div className="waiting_push_actions">
                {challengeHref && canChallenge ? (
                  <ActionButton href={challengeHref} variant="primary">Challenge</ActionButton>
                ) : challengeDisabledReason ? (
                  <span
                    aria-label={challengeDisabledReason}
                    className="waiting_push_tooltip_anchor"
                    data-tooltip={challengeDisabledReason}
                    tabIndex={0}
                  >
                    <ActionButton disabled onClick={undefined} variant="primary">{actionLabel}</ActionButton>
                  </span>
                ) : (
                  <ActionButton disabled={!canChallenge} onClick={canChallenge ? onChallenge : undefined} variant="primary">{actionLabel}</ActionButton>
                )}
              </div>
            </div>
          </div>
        ) : (
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
                    ) : challengeDisabledReason ? (
                      <span
                        aria-label={challengeDisabledReason}
                        className="waiting_push_tooltip_anchor"
                        data-tooltip={challengeDisabledReason}
                        tabIndex={0}
                      >
                        <ActionButton disabled onClick={undefined} variant="primary">{actionLabel}</ActionButton>
                      </span>
                    ) : (
                      <ActionButton disabled={!canChallenge} onClick={canChallenge ? onChallenge : undefined} variant="primary">{actionLabel}</ActionButton>
                    )}
                  </div>
                </div>
              </div>
            </dl>
          </div>
        )}
      </div>
    </article>
  );
}
