import type { MediaRecord } from "@/types/palate";
import { ActionButton } from "./action_button";
import { MediaRenderer } from "./media_renderer";
import { useMediaViewer } from "@/providers/media_viewer_provider";
import { getMediaDisplayTitle } from "@/utils/media_display";

type BuffDecisionCardProps = {
  side: "A" | "B";
  media: MediaRecord;
  selected?: boolean;
  onSelect?: () => void;
  disabledSelection?: boolean;
};

export function BuffDecisionCard({ side, media, selected = false, onSelect, disabledSelection = false }: BuffDecisionCardProps) {
  const { openMediaViewer } = useMediaViewer();
  const displayTitle = getMediaDisplayTitle(media);
  return (
    <article
      aria-label={`Buff candidate side ${side}`}
      className={`buff_decision_card card_shell buff_side_${side.toLowerCase()} ${selected ? "selected" : ""}`}
    >
      <div className="buff_side_label">Media {side}</div>
      <button
        aria-label={`View media for side ${side}`}
        className={`buff_media_stage card_preview buff_media_stage_button media_preview_${media.accent}`}
        onClick={() => openMediaViewer(media, "buff_decision_card")}
        type="button"
      >
        <MediaRenderer disablePreview media={media} variant="selector" />
      </button>
      <div className="buff_decision_meta card_body">
        <h3 title={displayTitle}>{displayTitle}</h3>
      </div>
      <ActionButton className="buff_choose_button" disabled={disabledSelection} onClick={onSelect} variant={selected ? "primary" : "secondary"}>
        {selected ? `Selected ${side}` : `Choose ${side}`}
      </ActionButton>
    </article>
  );
}
