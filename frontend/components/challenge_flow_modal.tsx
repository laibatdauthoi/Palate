import { ActionButton } from "./action_button";
import { AmountInput } from "./amount_input";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { MediaRenderer } from "./media_renderer";
import { ModalShell } from "./modal_shell";
import type { FeedbackMessage, MediaRecord, WaitingPush } from "@/types/palate";
import { getMediaDisplayTitle } from "@/utils/media_display";

type ChallengeFlowModalProps = {
  open: boolean;
  selectedPush: WaitingPush | null;
  selectedPushCategoryLabel: string;
  challengeOptions: MediaRecord[];
  selectedMediaId: string;
  challengeAmount: string;
  challengeAmountHelperText: string;
  challengeAmountValid: boolean;
  challengeBalanceValid: boolean;
  requiredChallengeLabel: string;
  walletReady: boolean;
  pushBusy: boolean;
  challengeFeedback: FeedbackMessage | null;
  selfChallengeReason?: string | null;
  onClose: () => void;
  onSelectMedia: (mediaId: string) => void;
  onChallengeAmountChange: (value: string) => void;
  onBackToMedia: () => void;
  onSubmit: () => void;
};

export function ChallengeFlowModal({
  open,
  selectedPush,
  selectedPushCategoryLabel,
  challengeOptions,
  selectedMediaId,
  challengeAmount,
  challengeAmountHelperText,
  challengeAmountValid,
  challengeBalanceValid,
  requiredChallengeLabel,
  walletReady,
  pushBusy,
  challengeFeedback,
  selfChallengeReason,
  onClose,
  onSelectMedia,
  onChallengeAmountChange,
  onBackToMedia,
  onSubmit
}: ChallengeFlowModalProps) {
  const selectedMedia = challengeOptions.find((media) => String(media.id) === selectedMediaId) ?? null;
  const showEmptyState = Boolean(selectedPush && !selfChallengeReason && challengeOptions.length === 0);
  const canConfirm = Boolean(
    walletReady
      && selectedPush
      && selectedMedia
      && challengeAmountValid
      && challengeBalanceValid
      && !pushBusy
      && !selfChallengeReason
  );

  return (
    <ModalShell title="Challenge Push" open={open} onClose={onClose}>
      <div className="stack challenge_modal_content">
        {selectedPush ? (
          <div className="challenge_modal_summary">
            <div>
              <span className="state_mark">Waiting push</span>
              <strong>{getMediaDisplayTitle(selectedPush.media)}</strong>
            </div>
            <div>
              <span className="state_mark">Minimum</span>
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
            <p className="secondary_text challenge_modal_intro">Step 1: choose same-category idle media to challenge this push.</p>
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
            <p className="secondary_text challenge_modal_intro">Step 2: enter a challenge amount and confirm.</p>
            <div className="challenge_selected_media">
              <div className={`challenge_selected_media_preview media_preview_${selectedMedia.accent}`}>
                <MediaRenderer disablePreview media={selectedMedia} variant="selector" />
              </div>
              <div className="challenge_selected_media_body">
                <span className="state_mark">Selected media</span>
                <strong>{getMediaDisplayTitle(selectedMedia)}</strong>
                <div className="cluster">
                  <CategoryBadge category={selectedMedia.category} />
                  <FormatBadge format={selectedMedia.format} />
                </div>
              </div>
            </div>
            <div className="amount_field_stack">
              <AmountInput label="Challenge amount" onChange={onChallengeAmountChange} placeholder={`Minimum ${requiredChallengeLabel}`} value={challengeAmount} />
              <p className={`amount_helper ${challengeAmountValid && challengeBalanceValid ? "" : "amount_helper_error"}`}>
                {challengeAmountHelperText}
              </p>
            </div>
            {challengeFeedback ? <p className={`feedback_text feedback_${challengeFeedback.type}`}>{challengeFeedback.message}</p> : null}
            {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to challenge Pushes on Aptos Testnet.</p> : null}
            <div className="challenge_step_actions">
              <ActionButton onClick={onBackToMedia} variant="secondary">Choose Another Media</ActionButton>
              <ActionButton disabled={!canConfirm} onClick={onSubmit}>
                {pushBusy ? "Challenging" : "Confirm Challenge"}
              </ActionButton>
            </div>
          </>
        ) : null}
      </div>
    </ModalShell>
  );
}
