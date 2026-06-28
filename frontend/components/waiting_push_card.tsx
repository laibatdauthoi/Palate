import type { WaitingPush } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { MediaRenderer } from "./media_renderer";
import { StatusBadge } from "./status_badge";
import { useMediaViewer } from "@/providers/media_viewer_provider";
import { getMediaDisplayTitle } from "@/utils/media_display";
import { AudioPreviewGlyph } from "./audio_preview_glyph";

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
  onOpen,
  title
}: {
  interactive: boolean;
  onOpen?: () => void;
  title: string;
}) {
  if (!interactive) {
    return (
      <div className="waiting_audio_preview waiting_audio_preview_static" aria-hidden="true">
        <AudioPreviewGlyph shellClassName="waiting_audio_icon_shell" iconClassName="waiting_audio_icon" />
      </div>
    );
  }

  return (
    <button
      aria-label={`View ${title}`}
      className="waiting_audio_preview waiting_audio_preview_button"
      onClick={onOpen}
      type="button"
    >
      <AudioPreviewGlyph shellClassName="waiting_audio_icon_shell" iconClassName="waiting_audio_icon" />
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
  const { openMediaViewer } = useMediaViewer();
  const displayTitle = getMediaDisplayTitle(push.media);
  const canChallenge = push.status === "open" && !challengeDisabledReason && Boolean(challengeHref || onChallenge);
  const canPreviewAudio = push.media.category === "audio";
  const isCompact = variant === "compact";
  const cardStatus = push.status === "open" ? "open" : push.status === "challenged" ? "active" : "disabled";
  const actionLabel = push.status === "open" ? "Challenge" : "Closed";
  return (
    <article className={`waiting_push_card card_shell card_shell_interactive waiting_push_card_${push.media.category} ${isCompact ? "waiting_push_card_compact" : ""}`}>
      <div className={`waiting_media card_preview media_preview_${push.media.accent}`}>
        {push.media.category === "audio" ? (
          <WaitingAudioPreview
            interactive={canPreviewAudio}
            onOpen={canPreviewAudio ? () => openMediaViewer(push.media, "media_renderer:audio_match") : undefined}
            title={displayTitle}
          />
        ) : (
          <MediaRenderer media={push.media} variant={isCompact ? "card" : "compact"} />
        )}
      </div>
      <div className="waiting_push_body card_body">
        {isCompact ? (
          <>
            <div className="spread waiting_push_compact_title_row card_title_row">
              <h3 title={displayTitle}>{displayTitle}</h3>
              <StatusBadge status={cardStatus} />
            </div>
            <div className="cluster waiting_push_compact_chip_row card_chip_row">
              <CategoryBadge category={push.media.category} />
              <FormatBadge format={push.media.format} />
            </div>
          </>
        ) : (
          <div className="waiting_push_header">
            <div className="waiting_push_title_group">
              <h3 title={displayTitle}>{displayTitle}</h3>
              <div className="cluster">
                <CategoryBadge category={push.media.category} />
                <FormatBadge format={push.media.format} />
              </div>
            </div>
            <StatusBadge status={cardStatus} />
          </div>
        )}
        {isCompact ? (
          <div className="spread media_meta waiting_push_meta_compact card_footer">
            <div className="waiting_push_required_meta">
              <span>Required Amount</span>
              <strong>{push.minChallengeAmount}</strong>
            </div>
            <div className="media_card_actions waiting_push_action_stack_compact card_actions">
              <div className="waiting_push_actions card_actions">
                {challengeHref && canChallenge ? (
                  <ActionButton href={challengeHref} size="cardMain" variant="primary">Challenge</ActionButton>
                ) : challengeDisabledReason ? (
                  <span
                    aria-label={challengeDisabledReason}
                    className="waiting_push_tooltip_anchor"
                    data-tooltip={challengeDisabledReason}
                    tabIndex={0}
                  >
                    <ActionButton disabled onClick={undefined} size="cardMain" variant="primary">{actionLabel}</ActionButton>
                  </span>
                ) : (
                  <ActionButton disabled={!canChallenge} onClick={canChallenge ? onChallenge : undefined} size="cardMain" variant="primary">{actionLabel}</ActionButton>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="waiting_push_meta card_footer">
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
                  <div className="waiting_push_actions card_actions">
                    {challengeHref && canChallenge ? (
                      <ActionButton href={challengeHref} size="cardMain" variant="primary">Challenge</ActionButton>
                    ) : challengeDisabledReason ? (
                      <span
                        aria-label={challengeDisabledReason}
                        className="waiting_push_tooltip_anchor"
                        data-tooltip={challengeDisabledReason}
                        tabIndex={0}
                      >
                        <ActionButton disabled onClick={undefined} size="cardMain" variant="primary">{actionLabel}</ActionButton>
                      </span>
                    ) : (
                      <ActionButton disabled={!canChallenge} onClick={canChallenge ? onChallenge : undefined} size="cardMain" variant="primary">{actionLabel}</ActionButton>
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
