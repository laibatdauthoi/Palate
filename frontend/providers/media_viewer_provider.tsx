"use client";

/* eslint-disable @next/next/no-img-element */

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { VIDEO_ENABLED } from "@/config/app_config";
import { resolveShelbyReadUrl } from "@/services/shelby_service";
import type { MediaRecord } from "@/types/palate";
import { getMediaDisplayTitle } from "@/utils/media_display";
import { detectMediaKindFromMetadata } from "@/utils/media_file_validation";
import { ActionButton } from "@/components/action_button";
import { FormatBadge } from "@/components/format_badge";
import { ModalShell } from "@/components/modal_shell";
import { PlayerIcon, useMediaPlayer } from "./media_player_provider";

type MediaViewerContextValue = {
  openMediaViewer: (media: MediaRecord, source: string) => void;
  closeMediaViewer: () => void;
};

const MediaViewerContext = createContext<MediaViewerContextValue | null>(null);

type ViewerState = {
  media: MediaRecord;
  source: string;
  openedBy: string;
  kind: "image" | "audio" | "video" | "unknown";
  status: "loading" | "ready" | "error";
  naturalWidth?: number;
  naturalHeight?: number;
  errorMessage?: string;
};

function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function SingleTrackAudioViewer({
  source,
  title,
  format
}: {
  source: string;
  title: string;
  format: MediaRecord["format"];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const hasProgress = duration > 0;
  const progressMax = hasProgress ? duration : 1;
  const playLabel = isPlaying ? "Pause" : currentTime > 0 ? "Resume" : "Play";

  const syncPlaybackState = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    setVolume(audio.volume);
    setIsPlaying(!audio.paused && !audio.ended);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = isRepeatEnabled;
  }, [isRepeatEnabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const element = audio;

    syncPlaybackState();

    function handleLoadedMetadata() {
      setPlayerError(null);
      syncPlaybackState();
    }

    function handleTimeUpdate() {
      setCurrentTime(element.currentTime);
    }

    function handleDurationChange() {
      setDuration(Number.isFinite(element.duration) ? element.duration : 0);
    }

    function handlePlay() {
      setPlayerError(null);
      setIsPlaying(true);
    }

    function handlePause() {
      setIsPlaying(false);
    }

    function handleEnded() {
      setIsPlaying(false);
      setCurrentTime(element.duration || 0);
    }

    function handleError() {
      setPlayerError("Audio could not be played.");
      setIsPlaying(false);
    }

    element.addEventListener("loadedmetadata", handleLoadedMetadata);
    element.addEventListener("timeupdate", handleTimeUpdate);
    element.addEventListener("durationchange", handleDurationChange);
    element.addEventListener("play", handlePlay);
    element.addEventListener("pause", handlePause);
    element.addEventListener("ended", handleEnded);
    element.addEventListener("error", handleError);

    return () => {
      element.pause();
      element.currentTime = 0;
      element.removeEventListener("loadedmetadata", handleLoadedMetadata);
      element.removeEventListener("timeupdate", handleTimeUpdate);
      element.removeEventListener("durationchange", handleDurationChange);
      element.removeEventListener("play", handlePlay);
      element.removeEventListener("pause", handlePause);
      element.removeEventListener("ended", handleEnded);
      element.removeEventListener("error", handleError);
    };
  }, [source, syncPlaybackState]);

  const handleTogglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    try {
      setPlayerError(null);
      await audio.play();
    } catch {
      setPlayerError("Audio could not be played.");
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const handleToggleRepeat = useCallback(() => {
    setIsRepeatEnabled((current) => !current);
  }, []);

  const handleSeek = useCallback((nextValue: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = nextValue;
    setCurrentTime(nextValue);
  }, []);

  const handleVolumeChange = useCallback((nextValue: number) => {
    const audio = audioRef.current;
    setVolume(nextValue);
    if (audio) {
      audio.volume = nextValue;
    }
  }, []);

  return (
    <div className="media_viewer_audio_detail">
      <div className="media_viewer_audio_card">
        <div className="audio_preview_visual" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="media_viewer_audio_text">
          <strong className="media_viewer_audio_filename">{title}</strong>
        </div>
      </div>
      <div className="media_viewer_audio_meta_row">
        <FormatBadge format={format} />
      </div>
      <div className="media_viewer_audio_top_row">
        <div className="media_viewer_audio_controls">
          <button
            aria-label={playLabel}
            className="media_icon_button primary media_viewer_audio_icon_button media_viewer_audio_icon_button_primary"
            onClick={() => void handleTogglePlayback()}
            title={playLabel}
            type="button"
          >
            <PlayerIcon name={isPlaying ? "pause" : "play"} />
          </button>
          <button
            aria-label="Repeat current track"
            aria-pressed={isRepeatEnabled}
            className={`media_icon_button media_viewer_audio_icon_button ${isRepeatEnabled ? "active" : ""}`}
            onClick={handleToggleRepeat}
            title="Repeat current track"
            type="button"
          >
            <PlayerIcon name="repeatOne" />
          </button>
        </div>
        <div className="media_viewer_audio_volume_row global_media_volume">
          <span className="media_viewer_audio_volume_icon" aria-hidden="true"><PlayerIcon name={volume <= 0.001 ? "mute" : "volume"} /></span>
          <input
            aria-label="Adjust audio volume"
            className="media_viewer_audio_slider media_viewer_audio_volume_slider"
            max={1}
            min={0}
            onChange={(event) => handleVolumeChange(Number(event.currentTarget.value))}
            step={0.01}
            type="range"
            value={volume}
          />
          <span className="media_viewer_audio_volume_value">{Math.round(volume * 100)}%</span>
        </div>
      </div>
      <div className="media_viewer_audio_progress global_media_progress">
        <span className="media_viewer_audio_time">{formatPlaybackTime(currentTime)}</span>
        <input
          aria-label="Seek audio playback"
          className="media_viewer_audio_slider"
          max={progressMax}
          min={0}
          onChange={(event) => handleSeek(Number(event.currentTarget.value))}
          step={0.1}
          type="range"
          value={Math.min(currentTime, progressMax)}
        />
        <span className="media_viewer_audio_time">{formatPlaybackTime(duration)}</span>
      </div>
      {playerError ? <p className="media_viewer_audio_error">{playerError}</p> : null}
      <audio className="media_viewer_audio_element" preload="metadata" ref={audioRef} src={source} />
    </div>
  );
}

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
        openedBy: viewer.openedBy
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
      setViewer({ media, source: resolvedSource, openedBy: source, kind: normalizedKind, status: "loading" });
      const image = new Image();
      image.onload = () => {
        if (requestIdRef.current !== requestId) return;
        setViewer({
          media,
          source: resolvedSource,
          openedBy: source,
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
          openedBy: source,
          kind: normalizedKind,
          status: "error",
          errorMessage: "Image could not be loaded."
        });
      };
      image.src = resolvedSource;
      return;
    }

    setViewer({ media, source: resolvedSource, openedBy: source, kind: normalizedKind, status: "ready" });
  }, []);

  const contextValue = useMemo<MediaViewerContextValue>(() => ({
    openMediaViewer,
    closeMediaViewer
  }), [closeMediaViewer, openMediaViewer]);

  const viewerTitle = viewer ? getMediaDisplayTitle(viewer.media) : "";
  const isHomeMatchAudioViewer = viewer?.kind === "audio" && viewer.openedBy === "media_renderer:audio_match";
  const viewerModalTitle = viewer?.kind === "audio" ? "Audio track" : viewerTitle;
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
                <span aria-hidden="true" className="media_viewer_header_spacer" />
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
          <ModalShell open={Boolean(viewer)} onClose={closeMediaViewer} title={viewerModalTitle}>
            <div className={`media_detail_view media_viewer_shell${viewer.kind === "audio" ? " media_viewer_audio_shell" : ""}`}>
              {viewer.kind === "audio" ? (
                isHomeMatchAudioViewer ? (
                  <SingleTrackAudioViewer format={viewer.media.format} source={viewerSource} title={viewerTitle} />
                ) : (
                  <div className="media_viewer_audio_detail">
                    <div className="media_viewer_audio_card">
                      <div className="audio_preview_visual" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="media_viewer_audio_text">
                        <small>Audio file</small>
                        <strong className="media_viewer_audio_filename" title={viewerTitle}>{viewerTitle}</strong>
                      </div>
                    </div>
                    <div className="media_viewer_audio_meta_row">
                      <FormatBadge format={viewer.media.format} />
                    </div>
                    <p className="media_viewer_audio_support">Audio playback stays in the global player.</p>
                    <div className="media_viewer_audio_actions">
                      <ActionButton
                        className="media_viewer_audio_action"
                        disabled={!canPlayMedia(viewer.media)}
                        onClick={() => playMedia(viewer.media)}
                        type="button"
                        variant="primary"
                      >
                        Play in player
                      </ActionButton>
                    </div>
                  </div>
                )
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
