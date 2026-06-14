"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { getShelbyDisplaySource } from "@/services/shelby_service";
import type { MediaRecord } from "@/types/palate";
import { detectMediaKindFromMetadata } from "@/utils/media_file_validation";
import { ModalShell } from "./modal_shell";

type MediaRendererProps = {
  media: MediaRecord;
  compact?: boolean;
};

function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:");
}

export function MediaRenderer({ media, compact = false }: MediaRendererProps) {
  const [failed, setFailed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const source = useMemo(() => getShelbyDisplaySource(media), [media]);
  const mediaKind = useMemo(() => detectMediaKindFromMetadata(media.mimeType, media.originalFileName), [media.mimeType, media.originalFileName]);
  const hasPlayableSource = source && isHttpUrl(source) && !failed;

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
            onError={() => setFailed(true)}
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
      <div className={`media_renderer media_renderer_player ${compact ? "media_renderer_compact" : ""}`}>
        <span>{media.title}</span>
        <audio controls onError={() => setFailed(true)} preload="metadata" src={source} />
      </div>
    );
  }

  if (mediaKind === "video") {
    return (
      <>
        <div className={`media_renderer media_renderer_video_frame ${compact ? "media_renderer_compact" : ""}`}>
          <video
            className="media_renderer_video"
            controls
            onError={() => setFailed(true)}
            playsInline
            preload="metadata"
            src={source}
          />
          <button className="media_expand_button" onClick={() => setDetailOpen(true)} type="button">
            View full
          </button>
        </div>
        <ModalShell open={detailOpen} onClose={() => setDetailOpen(false)} title={media.title}>
          <div className="media_detail_view">
            <video className="media_detail_asset" controls playsInline src={source} />
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
