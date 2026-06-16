import type { MouseEvent } from "react";
import type { MediaRecord } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { MediaRenderer } from "./media_renderer";
import { StatusBadge } from "./status_badge";
import { VIDEO_ENABLED } from "@/config/app_config";
import { isMediaCategoryCompatible } from "@/utils/media_file_validation";
import { getMediaDisplayTitle } from "@/utils/media_display";
import { getPushEligibility } from "@/utils/push_eligibility";

type MediaCardProps = {
  media: MediaRecord;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  actionDisabled?: boolean;
  mediaActive?: boolean;
  mediaPlaying?: boolean;
  onMediaToggle?: () => void;
};

export function MediaCard({ media, actionLabel, onAction, secondaryActionLabel, onSecondaryAction, actionDisabled, mediaActive = false, mediaPlaying = false, onMediaToggle }: MediaCardProps) {
  const displayTitle = getMediaDisplayTitle(media);
  const isInvalidMediaType = media.source === "palate" && !isMediaCategoryCompatible(media.category, media.mimeType, media.originalFileName);
  const isVideoDisabled = media.category === "video" && !VIDEO_ENABLED;
  const pushEligibility = media.status === "idle" ? getPushEligibility(media) : null;
  const isShelbyUploadFailed = media.storageStatus === "shelby_upload_failed";
  const isDeletePending = media.deletePending === true;
  const isContentUnavailable = media.contentUnavailable === true;
  const isShelbyCleanupRequired = media.shelbyCleanupRequired === true;
  const isDeleteAction = actionLabel === "Delete";

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    if (!onMediaToggle || media.category !== "audio") return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, textarea, label")) return;
    onMediaToggle();
  }

  return (
    <article className={`media_card ${mediaActive ? "media_card_audio_active" : ""}`} onClick={handleCardClick}>
      <div className={`media_preview media_preview_${media.accent}`} aria-label={displayTitle}>
        <div className="media_preview_inner">
          <MediaRenderer
            media={media}
            mediaActive={mediaActive}
            mediaPlaying={mediaPlaying}
            onMediaToggle={onMediaToggle}
          />
        </div>
      </div>
      <div className="media_card_body">
        <div className="spread">
          <h3>{displayTitle}</h3>
          <StatusBadge status={isShelbyCleanupRequired ? "shelby_cleanup_required" : isDeletePending ? "delete_pending" : isContentUnavailable ? "content_unavailable" : isShelbyUploadFailed ? "shelby_upload_failed" : isVideoDisabled ? "video_disabled" : isInvalidMediaType ? "invalid_media_type" : media.status} />
        </div>
        <div className="cluster">
          <CategoryBadge category={media.category} />
          <FormatBadge format={media.format} />
        </div>
        <div className="spread media_meta">
          <span>{media.createdTime}</span>
          <div className="media_card_actions">
            {actionLabel ? <ActionButton disabled={actionDisabled || (isVideoDisabled && !isDeleteAction) || (isInvalidMediaType && !isDeleteAction && !isShelbyUploadFailed) || (isContentUnavailable && !isDeleteAction && !isDeletePending)} onClick={onAction} variant={isDeleteAction || isShelbyUploadFailed || isShelbyCleanupRequired ? "danger" : "secondary"}>{actionLabel}</ActionButton> : null}
            {secondaryActionLabel ? <ActionButton onClick={onSecondaryAction} variant="ghost">{secondaryActionLabel}</ActionButton> : null}
          </div>
        </div>
        {isInvalidMediaType ? (
          <div className="invalid_media_note">
            <span>This file type does not match its category.</span>
          </div>
        ) : null}
        {isShelbyUploadFailed ? (
          <div className="recovery_note">
            <span>Shelby registration succeeded, but file upload failed.</span>
            <span>This media cannot be pushed or challenged. Delete it and upload again.</span>
          </div>
        ) : null}
        {isDeletePending ? (
          <div className="recovery_note">
            <span>Content was removed from Shelby, but on-chain delete did not complete.</span>
            <span>This media cannot be pushed or challenged.</span>
          </div>
        ) : null}
        {isShelbyCleanupRequired ? (
          <div className="recovery_note">
            <span>Shelby cleanup must finish before Palate can hide this media.</span>
            <span>This media cannot be pushed or challenged.</span>
          </div>
        ) : null}
        {isContentUnavailable ? (
          <div className="recovery_note">
            <span>This media file is unavailable on Shelby.</span>
            <span>This media cannot be pushed or challenged.</span>
          </div>
        ) : null}
        {isVideoDisabled ? (
          <div className="recovery_note">
            <span>Video uploads and playback are temporarily disabled for MVP.</span>
            <span>This media cannot be pushed or challenged.</span>
          </div>
        ) : null}
        {actionLabel === "Push" && actionDisabled && pushEligibility ? (
          <div className="recovery_note">
            <span>{pushEligibility.reason}</span>
            <span>This media cannot be pushed until it becomes eligible.</span>
          </div>
        ) : null}
        {media.source === "palate_upload_recovery" ? (
          <div className="recovery_note">
            <span>This Shelby upload is not registered in Palate yet and cannot be pushed.</span>
            {media.shelbyRegistrationHash ? <span>Shelby tx {media.shelbyRegistrationHash.slice(0, 8)}...{media.shelbyRegistrationHash.slice(-6)}</span> : null}
            {media.registrationError ? <span>{media.registrationError}</span> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
