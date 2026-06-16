"use client";

/* eslint-disable @next/next/no-img-element */

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { VIDEO_ENABLED } from "@/config/app_config";
import { resolveShelbyReadUrl } from "@/services/shelby_service";
import type { MediaRecord } from "@/types/palate";
import { getMediaDisplayTitle } from "@/utils/media_display";
import { detectMediaKindFromMetadata } from "@/utils/media_file_validation";
import { ModalShell } from "@/components/modal_shell";
import { useMediaPlayer } from "./media_player_provider";

type MediaViewerContextValue = {
  openMediaViewer: (media: MediaRecord, source: string) => void;
  closeMediaViewer: () => void;
};

const MediaViewerContext = createContext<MediaViewerContextValue | null>(null);

type ViewerState = {
  media: MediaRecord;
  source: string;
  kind: "image" | "audio" | "video" | "unknown";
  status: "loading" | "ready" | "error";
  naturalWidth?: number;
  naturalHeight?: number;
  errorMessage?: string;
};

function debugViewerTransition(details: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  console.debug("[Palate media viewer]", details);
}

export function MediaViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const requestIdRef = useRef(0);
  const { canPlayMedia, playMedia } = useMediaPlayer();

  const closeMediaViewer = useCallback(() => {
    if (viewer && process.env.NODE_ENV !== "production") {
      debugViewerTransition({
        action: "close",
        mediaId: viewer.media.palateMediaId ?? viewer.media.id,
        title: getMediaDisplayTitle(viewer.media),
        openedBy: viewer.source
      });
    }
    setViewer(null);
  }, [viewer]);

  const openMediaViewer = useCallback((media: MediaRecord, source: string) => {
    const resolvedSource = resolveShelbyReadUrl(media);
    const displayTitle = getMediaDisplayTitle(media);
    const kind = detectMediaKindFromMetadata(media.mimeType, media.originalFileName);
    const normalizedKind: ViewerState["kind"] = kind === "image" || kind === "audio" || kind === "video" ? kind : "unknown";
    const requestId = ++requestIdRef.current;

    if (process.env.NODE_ENV !== "production") {
      debugViewerTransition({
        action: "open",
        openedBy: source,
        mediaId: media.palateMediaId ?? media.id,
        title: displayTitle,
        source: resolvedSource,
        kind: normalizedKind,
        component: source.includes("renderer") ? "MediaRenderer" : "unknown"
      });
    }

    if (normalizedKind === "image") {
      setViewer({ media, source: resolvedSource, kind: normalizedKind, status: "loading" });
      const image = new Image();
      image.onload = () => {
        if (requestIdRef.current !== requestId) return;
        setViewer({
          media,
          source: resolvedSource,
          kind: normalizedKind,
          status: "ready",
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight
        });
      };
      image.onerror = () => {
        if (requestIdRef.current !== requestId) return;
        setViewer({
          media,
          source: resolvedSource,
          kind: normalizedKind,
          status: "error",
          errorMessage: "Image could not be loaded."
        });
      };
      image.src = resolvedSource;
      return;
    }

    setViewer({ media, source: resolvedSource, kind: normalizedKind, status: "ready" });
  }, []);

  const contextValue = useMemo<MediaViewerContextValue>(() => ({
    openMediaViewer,
    closeMediaViewer
  }), [closeMediaViewer, openMediaViewer]);

  const viewerTitle = viewer ? getMediaDisplayTitle(viewer.media) : "";
  const viewerSource = viewer ? viewer.source : "";
  const viewerAspectRatio = viewer && viewer.kind === "image" && viewer.naturalWidth && viewer.naturalHeight
    ? `${viewer.naturalWidth} / ${viewer.naturalHeight}`
    : undefined;

  useEffect(() => {
    if (!viewer || viewer.kind !== "image") return undefined;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMediaViewer();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeMediaViewer, viewer]);

  return (
    <MediaViewerContext.Provider value={contextValue}>
      {children}
      {viewer ? (
        viewer.kind === "image" ? (
          <div className="media_viewer_overlay" role="presentation" onMouseDown={closeMediaViewer}>
            <div className="media_viewer_overlay_inner" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="media_viewer_title">
              <div className="media_viewer_overlay_header">
                <div className="media_viewer_header_text">
                  <strong id="media_viewer_title">{viewerTitle}</strong>
                </div>
                <button aria-label="Close viewer" className="media_viewer_close" onClick={closeMediaViewer} type="button">Close</button>
              </div>
              {viewer.status === "loading" ? (
                <div className="media_viewer_loading">
                  <strong>{viewerTitle}</strong>
                  <p>Loading image…</p>
                </div>
              ) : viewer.status === "error" ? (
                <div className="media_viewer_disabled">
                  <strong>{viewerTitle}</strong>
                  <p>{viewer.errorMessage ?? "Image could not be loaded."}</p>
                </div>
              ) : (
                <div className="media_viewer_image_shell" style={viewerAspectRatio ? { aspectRatio: viewerAspectRatio } : undefined}>
                  <img
                    alt={viewerTitle}
                    className="media_viewer_image"
                    src={viewerSource}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <ModalShell open={Boolean(viewer)} onClose={closeMediaViewer} title={viewerTitle}>
            <div className="media_detail_view media_viewer_shell">
              {viewer.kind === "audio" ? (
                <div className="media_viewer_audio_detail">
                  <div className="media_viewer_caption">
                    <strong>{viewerTitle}</strong>
                    <p>Audio playback stays in the global player.</p>
                  </div>
                  <div className="cluster">
                    <button
                      className="media_icon_button primary"
                      disabled={!canPlayMedia(viewer.media)}
                      onClick={() => playMedia(viewer.media)}
                      type="button"
                    >
                      Play in player
                    </button>
                  </div>
                </div>
              ) : viewer.kind === "video" && !VIDEO_ENABLED ? (
                <div className="media_viewer_disabled">
                  <strong>{viewerTitle}</strong>
                  <p>Video playback is temporarily disabled for MVP.</p>
                </div>
              ) : (
                <video
                  className="media_detail_asset media_viewer_asset"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  src={viewerSource}
                />
              )}
            </div>
          </ModalShell>
        )
      ) : null}
    </MediaViewerContext.Provider>
  );
}

export function useMediaViewer() {
  const context = useContext(MediaViewerContext);
  if (!context) {
    throw new Error("useMediaViewer must be used inside MediaViewerProvider");
  }
  return context;
}
