import type { MockMedia } from "@/data/mock_data";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { StatusBadge } from "./status_badge";

type MediaCardProps = {
  media: MockMedia;
  actionLabel?: string;
};

export function MediaCard({ media, actionLabel }: MediaCardProps) {
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
          <span>{media.created}</span>
          {actionLabel ? <ActionButton variant="secondary">{actionLabel}</ActionButton> : null}
        </div>
      </div>
    </article>
  );
}
