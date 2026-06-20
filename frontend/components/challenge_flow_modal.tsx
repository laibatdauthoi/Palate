import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { MediaRenderer } from "./media_renderer";
import { ModalShell } from "./modal_shell";
import { useMediaViewer } from "@/providers/media_viewer_provider";
import type { FeedbackMessage, MediaRecord, WaitingPush } from "@/types/palate";
import { getMediaDisplayTitle } from "@/utils/media_display";

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
              <div className="challenge_media_picker_grid">
                {challengeOptions.map((media) => (
                  <button
                    className={`challenge_media_option ${selectedMediaId === String(media.id) ? "selected" : ""}`}
                    key={media.id}
                    onClick={() => onSelectMedia(String(media.id))}
                    type="button"
                  >
                    <div className={`challenge_media_option_preview media_preview_${media.accent}`}>
                      <MediaRenderer disablePreview media={media} variant="selector" />
                    </div>
                    <div className="challenge_media_option_body">
                      <strong>{getMediaDisplayTitle(media)}</strong>
                      <div className="cluster">
                        <CategoryBadge category={media.category} />
                        <FormatBadge format={media.format} />
                      </div>
                      <span className="challenge_media_option_meta">{media.createdTime}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {selectedPush && selectedMedia ? (
          <>
            <div className="challenge_selected_media">
              <button
                aria-label={`View ${getMediaDisplayTitle(selectedMedia)}`}
                className={`challenge_selected_media_preview media_preview_${selectedMedia.accent}`}
                onClick={() => openMediaViewer(selectedMedia, "challenge_flow_modal:selected_media")}
                type="button"
              >
                <MediaRenderer disablePreview media={selectedMedia} variant="selector" />
                <span aria-hidden="true" className="challenge_selected_media_overlay">
                  <span className="challenge_selected_media_overlay_icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                  </span>
                </span>
              </button>
              <div className="challenge_selected_media_body">
                <span className="state_mark">Selected media</span>
                <strong>{getMediaDisplayTitle(selectedMedia)}</strong>
                <div className="cluster">
                  <CategoryBadge category={selectedMedia.category} />
                  <FormatBadge format={selectedMedia.format} />
                </div>
              </div>
            </div>
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
