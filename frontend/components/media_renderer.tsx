"use client";

/* eslint-disable @next/next/no-img-element */

import { type SyntheticEvent, useMemo, useState } from "react";
import { resolveShelbyReadUrl } from "@/services/shelby_service";
import type { MediaRecord } from "@/types/palate";
import { detectMediaKindFromMetadata } from "@/utils/media_file_validation";
import { ModalShell } from "./modal_shell";

type MediaRendererProps = {
  media: MediaRecord;
  compact?: boolean;
  mediaActive?: boolean;
  mediaPlaying?: boolean;
  onMediaToggle?: () => void;
};

function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:");
}

export function MediaRenderer({ media, compact = false, mediaActive = false, mediaPlaying = false, onMediaToggle }: MediaRendererProps) {
  const [failed, setFailed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const source = useMemo(() => resolveShelbyReadUrl(media), [media]);
  const mediaKind = useMemo(() => detectMediaKindFromMetadata(media.mimeType, media.originalFileName), [media.mimeType, media.originalFileName]);
  const hasPlayableSource = source && isHttpUrl(source) && !failed;

  function handleUnavailable(event: SyntheticEvent<HTMLImageElement | HTMLVideoElement>) {
    const target = event.currentTarget;
    const errorCode = "error" in target && target.error ? target.error.code : null;
    if (process.env.NODE_ENV !== "production") {
      console.debug("[Palate media element error]", {
        mediaId: media.palateMediaId ?? media.id,
        category: media.category,
        mimeType: media.mimeType,
        displayUrl: media.displayUrl,
        shelbyBlobRef: media.shelbyBlobRef,
        resolvedReadUrl: source,
        errorCode
      });
    }
    setFailed(true);
  }

  if (!hasPlayableSource) {
    return (
      <div className={`media_renderer media_renderer_fallback ${compact ? "media_renderer_compact" : ""}`}>
        <span>{media.title}</span>
        <small>{failed ? "Media unavailable" : "Media source unavailable"}</small>
      </div>
    );
  }

  if (mediaKind === "image") {
    return (
      <>
        <button
          aria-label={`View ${media.title}`}
          className={`media_renderer media_renderer_button ${compact ? "media_renderer_compact" : ""}`}
          onClick={() => setDetailOpen(true)}
          type="button"
        >
          <img
            alt={media.title}
            className="media_renderer_image"
            onError={handleUnavailable}
            src={source}
          />
        </button>
        <ModalShell open={detailOpen} onClose={() => setDetailOpen(false)} title={media.title}>
          <div className="media_detail_view">
            <img alt={media.title} className="media_detail_asset" src={source} />
          </div>
        </ModalShell>
      </>
    );
  }

  if (mediaKind === "audio") {
    return (
      <div className={`media_renderer media_renderer_player media_renderer_audio_controlled ${mediaActive ? "active" : ""} ${compact ? "media_renderer_compact" : ""}`}>
        <button
          aria-label={`${mediaPlaying && mediaActive ? "Pause" : "Play"} ${media.title}`}
          className="audio_card_play_button"
          disabled={!onMediaToggle}
          onClick={onMediaToggle}
          type="button"
        >
          {mediaPlaying && mediaActive ? "Pause" : "Play"}
        </button>
        <span>{media.title}</span>
        <small>{mediaActive ? (mediaPlaying ? "Now playing" : "Selected track") : "Audio track"}</small>
      </div>
    );
  }

  if (mediaKind === "video") {
    return (
      <>
        <div className={`media_renderer media_renderer_video_frame ${mediaActive ? "active" : ""} ${compact ? "media_renderer_compact" : ""}`}>
          <video
            className="media_renderer_video"
            muted
            onError={handleUnavailable}
            playsInline
            preload="metadata"
            src={source}
          />
          <button
            aria-label={`${mediaPlaying && mediaActive ? "Pause" : "Play"} ${media.title}`}
            className="media_expand_button media_play_overlay"
            disabled={!onMediaToggle}
            onClick={onMediaToggle}
            type="button"
          >
            {mediaPlaying && mediaActive ? "Pause" : "Play"}
          </button>
          <button className="media_expand_button media_view_button" onClick={() => setDetailOpen(true)} type="button">
            View full
          </button>
        </div>
        <ModalShell open={detailOpen} onClose={() => setDetailOpen(false)} title={media.title}>
          <div className="media_detail_view">
            <video className="media_detail_asset" muted playsInline preload="metadata" src={source} />
          </div>
        </ModalShell>
      </>
    );
  }

  return (
    <div className={`media_renderer media_renderer_fallback ${compact ? "media_renderer_compact" : ""}`}>
      <span>{media.title}</span>
      <small>Unsupported media format</small>
    </div>
  );
}
