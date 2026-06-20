import { useMemo, useState } from "react";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { ModalShell } from "./modal_shell";
import { useMediaViewer } from "@/providers/media_viewer_provider";
import { resolveShelbyReadUrl } from "@/services/shelby_service";
import type { FeedbackMessage, MediaRecord, WaitingPush } from "@/types/palate";
import { getMediaDisplayTitle } from "@/utils/media_display";
import { detectMediaKindFromMetadata } from "@/utils/media_file_validation";

type ChallengeFlowModalProps = {
  open: boolean;
  selectedPush: WaitingPush | null;
  selectedPushCategoryLabel: string;
  challengeOptions: MediaRecord[];
  selectedMediaId: string;
  challengeBalanceValid: boolean;
  requiredChallengeLabel: string;
  walletReady: boolean;
  pushBusy: boolean;
  challengeFeedback: FeedbackMessage | null;
  selfChallengeReason?: string | null;
  onClose: () => void;
  onSelectMedia: (mediaId: string) => void;
  onBackToMedia: () => void;
  onSubmit: () => void;
};

function ChallengeThumbnail({
  interactive = false,
  media,
  onOpen
}: {
  media: MediaRecord;
  interactive?: boolean;
  onOpen?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const displayTitle = getMediaDisplayTitle(media);
  const source = useMemo(() => resolveShelbyReadUrl(media), [media]);
  const mediaKind = useMemo(
    () => detectMediaKindFromMetadata(media.mimeType, media.originalFileName),
    [media.mimeType, media.originalFileName]
  );
  const hasSource = Boolean(source && !(failed && mediaKind === "video"));

  function handleUnavailable() {
    setFailed(true);
  }

  const content = (() => {
    if (mediaKind === "image" && hasSource) {
      return (
        <div
          aria-label={displayTitle}
          className="challenge_thumb_media_bg"
          role="img"
          style={{ backgroundImage: `url("${source}")` }}
        />
      );
    }

    if (mediaKind === "video" && hasSource) {
      return (
        <video
          className="challenge_thumb_media"
          muted
          onError={handleUnavailable}
          playsInline
          preload="metadata"
          src={source}
        />
      );
    }

    return (
      <div className="challenge_thumb_audio" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 13a8 8 0 0 1 16 0" />
          <path d="M6 13v5a2 2 0 0 0 2 2h1v-7H8a2 2 0 0 0-2 2Z" />
          <path d="M18 13a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2Z" />
        </svg>
      </div>
    );
  })();

  if (interactive) {
    return (
      <button
        aria-label={`View ${displayTitle}`}
        className="challenge_selected_thumb"
        onClick={onOpen}
        type="button"
      >
        <div className={`challenge_thumb_frame challenge_thumb_frame_${media.accent}`}>{content}</div>
        <span aria-hidden="true" className="challenge_selected_media_overlay">
          <span className="challenge_selected_media_overlay_icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
        </span>
      </button>
    );
  }

  return <div className={`challenge_thumb_frame challenge_thumb_frame_${media.accent}`}>{content}</div>;
}

export function ChallengeFlowModal({
  open,
  selectedPush,
  selectedPushCategoryLabel,
  challengeOptions,
  selectedMediaId,
  challengeBalanceValid,
  requiredChallengeLabel,
  walletReady,
  pushBusy,
  challengeFeedback,
  selfChallengeReason,
  onClose,
  onSelectMedia,
  onBackToMedia,
  onSubmit
}: ChallengeFlowModalProps) {
  const { openMediaViewer } = useMediaViewer();
  const selectedMedia = challengeOptions.find((media) => String(media.id) === selectedMediaId) ?? null;
  const showEmptyState = Boolean(selectedPush && !selfChallengeReason && challengeOptions.length === 0);
  const modalSubtitle = selectedPush
    ? selectedMedia
      ? <span className="challenge_modal_subtitle">Review the selected media and confirm.</span>
      : <span className="challenge_modal_subtitle">Choose same-category idle media to challenge this push.</span>
    : undefined;
  const confirmLabel = pushBusy
    ? "Submitting"
    : !walletReady
      ? "Balance unavailable"
      : !challengeBalanceValid
        ? "Insufficient Balance"
        : "Confirm Challenge";
  const canConfirm = Boolean(
    walletReady
      && selectedPush
      && selectedMedia
      && challengeBalanceValid
      && !pushBusy
      && !selfChallengeReason
  );

  function renderChallengeCard(media: MediaRecord, options?: { selected?: boolean; onClick?: () => void }) {
    const { selected = false, onClick } = options ?? {};
    const displayTitle = getMediaDisplayTitle(media);

    return (
      <button
        aria-pressed={selected}
        className={`challenge_pick_card ${selected ? "selected" : ""}`}
        key={media.id}
        onClick={onClick}
        type="button"
      >
        <ChallengeThumbnail media={media} />
        <div className="challenge_pick_body">
          <h3 className="challenge_pick_title">{displayTitle}</h3>
          <div className="cluster">
            <CategoryBadge category={media.category} />
            <FormatBadge format={media.format} />
          </div>
          <div className="challenge_pick_meta">
            <span>{media.createdTime}</span>
          </div>
        </div>
      </button>
    );
  }

  function renderSelectedMediaPanel(media: MediaRecord) {
    const displayTitle = getMediaDisplayTitle(media);

    return (
      <div className="challenge_selected_panel">
        <ChallengeThumbnail
          interactive
          media={media}
          onOpen={() => openMediaViewer(media, "challenge_flow_modal:selected_media")}
        />
        <div className="challenge_selected_media_details">
          <strong>{displayTitle}</strong>
          <div className="cluster">
            <CategoryBadge category={media.category} />
            <FormatBadge format={media.format} />
          </div>
          <div className="challenge_pick_meta">
            <span>{media.createdTime}</span>
          </div>
        </div>
      </div>
    );

  }

  return (
    <ModalShell title="Challenge Push" subtitle={modalSubtitle} open={open} onClose={onClose}>
      <div className="stack challenge_modal_content">
        {selectedPush ? (
          <div className="challenge_modal_summary">
            <div>
              <span className="state_mark">Waiting push</span>
              <strong>{getMediaDisplayTitle(selectedPush.media)}</strong>
            </div>
            <div>
              <span className="state_mark">Required</span>
              <strong>{requiredChallengeLabel}</strong>
            </div>
          </div>
        ) : null}

        {selfChallengeReason ? <p className="feedback_text feedback_error">{selfChallengeReason}</p> : null}

        {showEmptyState ? (
          <div className="challenge_empty_state">
            <strong>No eligible same-category media.</strong>
            <p>Upload or free an idle {selectedPushCategoryLabel} media item to challenge this push.</p>
            <div className="challenge_empty_actions">
              <ActionButton href="/my-media" variant="secondary">Go to My Media</ActionButton>
              <ActionButton href="/my-media/upload" variant="secondary">Upload Media</ActionButton>
            </div>
          </div>
        ) : null}

        {selectedPush && !selfChallengeReason && challengeOptions.length > 0 && !selectedMedia ? (
          <>
            <div className="challenge_media_picker_scroller">
              <div className="challenge_pick_grid">
                {challengeOptions.map((media) => (
                  renderChallengeCard(media, {
                    onClick: () => onSelectMedia(String(media.id)),
                    selected: selectedMediaId === String(media.id)
                  })
                ))}
              </div>
            </div>
          </>
        ) : null}

        {selectedPush && selectedMedia ? (
          <>
            {renderSelectedMediaPanel(selectedMedia)}
            {challengeFeedback ? <p className={`feedback_text feedback_${challengeFeedback.type}`}>{challengeFeedback.message}</p> : null}
            {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to challenge Pushes on Aptos Testnet.</p> : null}
            <div className="challenge_action_row">
              <ActionButton className="challenge_row_button challenge_row_button_secondary" onClick={onBackToMedia} variant="secondary">Choose Another Media</ActionButton>
              <ActionButton className="challenge_row_button challenge_row_button_primary" disabled={!canConfirm} onClick={onSubmit}>
                {confirmLabel}
              </ActionButton>
            </div>
          </>
        ) : null}
      </div>
    </ModalShell>
  );
}
