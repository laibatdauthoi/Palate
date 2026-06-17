"use client";

/* eslint-disable @next/next/no-img-element */

import { type SyntheticEvent, useMemo, useState } from "react";
import { useMediaViewer } from "@/providers/media_viewer_provider";
import { VIDEO_ENABLED } from "@/config/app_config";
import { resolveShelbyReadUrl } from "@/services/shelby_service";
import type { MediaRecord } from "@/types/palate";
import { getMediaDisplayTitle } from "@/utils/media_display";
import { detectMediaKindFromMetadata } from "@/utils/media_file_validation";

type MediaRendererProps = {
  media: MediaRecord;
  compact?: boolean;
  variant?: "card" | "compact" | "match" | "selector";
  mediaActive?: boolean;
  mediaPlaying?: boolean;
  onMediaToggle?: () => void;
};

function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:");
}

export function MediaRenderer({ media, compact = false, variant, mediaActive = false, mediaPlaying = false, onMediaToggle }: MediaRendererProps) {
  const [failed, setFailed] = useState(false);
  const { openMediaViewer } = useMediaViewer();
  const source = useMemo(() => resolveShelbyReadUrl(media), [media]);
  const mediaKind = useMemo(() => detectMediaKindFromMetadata(media.mimeType, media.originalFileName), [media.mimeType, media.originalFileName]);
  const displayTitle = useMemo(() => getMediaDisplayTitle(media), [media]);
  const hasPlayableSource = source && isHttpUrl(source) && !failed;
  const resolvedVariant = variant ?? (compact ? "compact" : "card");

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

  if (mediaKind === "video" && !VIDEO_ENABLED) {
    return (
      <button
        aria-label={`View details for ${displayTitle}`}
        className={`media_renderer media_renderer_fallback media_renderer_video_disabled media_renderer_variant_${resolvedVariant}`}
        onClick={() => openMediaViewer(media, "media_renderer:video_disabled")}
        type="button"
      >
        <span>{displayTitle}</span>
        <small>Video disabled in MVP</small>
      </button>
    );
  }

  if (!hasPlayableSource) {
    return (
      <div className={`media_renderer media_renderer_fallback media_renderer_variant_${resolvedVariant}`}>
        <span>{displayTitle}</span>
        <small>{failed ? "Media unavailable" : "Media source unavailable"}</small>
      </div>
    );
  }

  if (mediaKind === "image") {
    return (
      <button
        aria-label={`View ${displayTitle}`}
        className={`media_renderer media_renderer_button media_renderer_variant_${resolvedVariant}`}
        onClick={() => openMediaViewer(media, "media_renderer:image")}
        type="button"
      >
        <img
          alt={displayTitle}
          className="media_renderer_image"
          onError={handleUnavailable}
          src={source}
        />
      </button>
    );
  }

  if (mediaKind === "audio") {
    return (
      <div
        className={`media_renderer media_renderer_player media_renderer_audio_controlled media_renderer_variant_${resolvedVariant} ${mediaActive ? "active" : ""}`}
        onClick={onMediaToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onMediaToggle?.();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="audio_preview_visual" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="audio_preview_meta">
          <small>{mediaActive ? (mediaPlaying ? "Now playing" : "Selected track") : "Audio track"}</small>
          <span>Tap to play</span>
        </div>
        <button
          aria-label={`${mediaPlaying && mediaActive ? "Pause" : "Play"} ${displayTitle}`}
          className="audio_card_play_button"
          disabled={!onMediaToggle}
          onClick={(event) => {
            event.stopPropagation();
            onMediaToggle?.();
          }}
          type="button"
        >
          {mediaPlaying && mediaActive ? "Pause" : "Play"}
        </button>
      </div>
    );
  }

  if (mediaKind === "video") {
    return (
      <div
        aria-label={`View ${displayTitle}`}
        className={`media_renderer media_renderer_video_frame media_renderer_variant_${resolvedVariant} ${mediaActive ? "active" : ""}`}
        onClick={() => openMediaViewer(media, "media_renderer:video")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMediaViewer(media, "media_renderer:video");
          }
        }}
        role="button"
        tabIndex={0}
      >
        <video
          className="media_renderer_video"
          muted
          onError={handleUnavailable}
          playsInline
          preload="metadata"
          src={source}
        />
        <button
          aria-label={`${mediaPlaying && mediaActive ? "Pause" : "Play"} ${displayTitle}`}
          className="media_expand_button media_play_overlay"
          disabled={!onMediaToggle}
          onClick={(event) => {
            event.stopPropagation();
            onMediaToggle?.();
          }}
          type="button"
        >
          {mediaPlaying && mediaActive ? "Pause" : "Play"}
        </button>
      </div>
    );
  }

  return (
    <div className={`media_renderer media_renderer_fallback media_renderer_variant_${resolvedVariant}`}>
      <span>{displayTitle}</span>
      <small>Unsupported media format</small>
    </div>
  );
}
