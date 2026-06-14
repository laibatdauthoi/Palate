import type { MediaRecord } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { MediaRenderer } from "./media_renderer";
import { StatusBadge } from "./status_badge";
import { isMediaCategoryCompatible } from "@/utils/media_file_validation";

type MediaCardProps = {
  media: MediaRecord;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  actionDisabled?: boolean;
};

export function MediaCard({ media, actionLabel, onAction, secondaryActionLabel, onSecondaryAction, actionDisabled }: MediaCardProps) {
  const isInvalidMediaType = media.source === "palate" && !isMediaCategoryCompatible(media.category, media.mimeType, media.originalFileName);
  const isShelbyUploadFailed = media.storageStatus === "shelby_upload_failed";

  return (
    <article className="media_card">
      <div className={`media_preview media_preview_${media.accent}`} aria-label={media.title}>
        <div className="media_preview_inner">
          <MediaRenderer media={media} />
        </div>
      </div>
      <div className="media_card_body">
        <div className="spread">
          <h3>{media.title}</h3>
          <StatusBadge status={isShelbyUploadFailed ? "shelby_upload_failed" : isInvalidMediaType ? "invalid_media_type" : media.status} />
        </div>
        <div className="cluster">
          <CategoryBadge category={media.category} />
          <FormatBadge format={media.format} />
        </div>
        <div className="spread media_meta">
          <span>{media.createdTime}</span>
          <div className="media_card_actions">
            {actionLabel ? <ActionButton disabled={actionDisabled || (isInvalidMediaType && !isShelbyUploadFailed)} onClick={onAction} variant={isShelbyUploadFailed ? "danger" : "secondary"}>{actionLabel}</ActionButton> : null}
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
