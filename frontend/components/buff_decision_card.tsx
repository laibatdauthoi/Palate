import type { MediaRecord } from "@/types/palate";
import { ActionButton } from "./action_button";
import { CategoryBadge } from "./category_badge";
import { FormatBadge } from "./format_badge";
import { MediaRenderer } from "./media_renderer";
import { getMediaDisplayTitle } from "@/utils/media_display";

type BuffDecisionCardProps = {
  side: "A" | "B";
  media: MediaRecord;
};

export function BuffDecisionCard({ side, media }: BuffDecisionCardProps) {
  const displayTitle = getMediaDisplayTitle(media);
  return (
    <article className={`buff_decision_card buff_side_${side.toLowerCase()}`}>
      <div className="buff_side_label">Media {side}</div>
      <div className={`buff_media_stage media_preview_${media.accent}`}>
        <MediaRenderer media={media} variant="selector" />
      </div>
      <div className="buff_decision_meta">
        <h3>{displayTitle}</h3>
        <div className="cluster">
          <CategoryBadge category={media.category} />
          <FormatBadge format={media.format} />
        </div>
      </div>
      <ActionButton>Buff {side}</ActionButton>
    </article>
  );
}
