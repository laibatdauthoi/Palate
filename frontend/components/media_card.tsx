import type { MediaRecord } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { StatusBadge } from "./status_badge";

type MediaCardProps = {
  media: MediaRecord;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  actionDisabled?: boolean;
};

export function MediaCard({ media, actionLabel, onAction, secondaryActionLabel, onSecondaryAction, actionDisabled }: MediaCardProps) {
  return (
    <article className="media_card">
      <div className={`media_preview media_preview_${media.accent}`} role="img" aria-label={media.title}>
        <div className="media_preview_inner">
          <span>{media.title}</span>
        </div>
      </div>
      <div className="media_card_body">
        <div className="spread">
          <h3>{media.title}</h3>
          <StatusBadge status={media.status} />
        </div>
        <div className="cluster">
          <CategoryBadge category={media.category} />
          <FormatBadge format={media.format} />
        </div>
        <div className="spread media_meta">
          <span>{media.createdTime}</span>
          <div className="media_card_actions">
            {actionLabel ? <ActionButton disabled={actionDisabled} onClick={onAction} variant="secondary">{actionLabel}</ActionButton> : null}
            {secondaryActionLabel ? <ActionButton onClick={onSecondaryAction} variant="ghost">{secondaryActionLabel}</ActionButton> : null}
          </div>
        </div>
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
