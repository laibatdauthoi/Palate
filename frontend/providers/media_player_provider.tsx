"use client";

import { createContext, type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { VIDEO_ENABLED } from "@/config/app_config";
import { preflightShelbyReadUrl, resolveShelbyReadUrl } from "@/services/shelby_service";
import type { MediaRecord } from "@/types/palate";
import { getMediaDisplayTitle } from "@/utils/media_display";
import { detectMediaKindFromMetadata, isMediaCategoryCompatible } from "@/utils/media_file_validation";
import { usePalate } from "./palate_provider";

type RepeatMode = "off" | "one" | "all";
type PlayerMediaKind = "audio" | "video";
type ActiveMode = PlayerMediaKind | null;

type MediaPlayerTrack = {
  id: number;
  mediaId: number;
  title: string;
  source: string;
  kind: PlayerMediaKind;
  originalFileName?: string;
  shelbyBlobRef?: string;
};

type PlayerPosition = {
  x: number;
  y: number;
};

type MediaPlayerContextValue = {
  currentTrack: MediaPlayerTrack | null;
  currentTrackId: number | null;
  isPlaying: boolean;
  canPlayMedia: (media: MediaRecord) => boolean;
  playMedia: (media: MediaRecord) => void;
  setQueueFromMedia: (media: MediaRecord[]) => void;
  togglePlayback: () => void;
};

const MediaPlayerContext = createContext<MediaPlayerContextValue | null>(null);
const default_volume = 0.85;
const minStartBufferSeconds = {
  audio: 3,
  video: 5
} as const;
const minResumeBufferSeconds = {
  audio: 2,
  video: 4
} as const;
const player_position_storage_key = "palate_global_media_player_position_v1";
const player_edge_margin = 16;
const mobile_bottom_nav_clearance = 104;

function debugPlayerTransition(details: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  console.debug("[Palate media player]", details);
}

function isHttpSource(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:");
}

function getPlayableTrack(media: MediaRecord): MediaPlayerTrack | null {
  const source = resolveShelbyReadUrl(media);
  const kind = detectMediaKindFromMetadata(media.mimeType, media.originalFileName);

  if (kind !== "audio" && kind !== "video") return null;
  if (kind === "video" && !VIDEO_ENABLED) return null;
  if (!source || !isHttpSource(source)) return null;
  if (media.source !== "palate") return null;
  if (!isMediaCategoryCompatible(media.category, media.mimeType, media.originalFileName)) return null;
  if ((media.storageStatus ?? "uploaded") !== "uploaded") return null;
  if (media.status === "pending_registration" || media.status === "registration_failed") return null;
  if (media.deletePending || media.contentUnavailable || media.shelbyCleanupRequired) return null;

  return {
    id: media.id,
    mediaId: media.palateMediaId ?? media.id,
    title: getMediaDisplayTitle(media),
    source,
    kind,
    originalFileName: media.originalFileName,
    shelbyBlobRef: media.shelbyBlobRef
  };
}

function formatSeconds(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getFiniteMediaTime(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function getBufferedAhead(element: HTMLMediaElement | null) {
  if (!element) return 0;
  const currentTime = element.currentTime;
  for (let index = 0; index < element.buffered.length; index += 1) {
    const start = element.buffered.start(index);
    const end = element.buffered.end(index);
    if (currentTime >= start && currentTime <= end) {
      return Math.max(0, end - currentTime);
    }
  }
  return 0;
}

function getPlayerViewportMargins() {
  if (typeof window === "undefined") {
    return { top: player_edge_margin, right: player_edge_margin, bottom: player_edge_margin, left: player_edge_margin };
  }
  const bottom = window.innerWidth < 768 ? mobile_bottom_nav_clearance : player_edge_margin;
  return {
    top: player_edge_margin,
    right: player_edge_margin,
    bottom,
    left: player_edge_margin
  };
}

function clampPlayerPosition(position: PlayerPosition, size: { width: number; height: number }) {
  if (typeof window === "undefined") return position;
  const margins = getPlayerViewportMargins();
  const maxX = Math.max(margins.left, window.innerWidth - size.width - margins.right);
  const maxY = Math.max(margins.top, window.innerHeight - size.height - margins.bottom);
  return {
    x: Math.min(Math.max(position.x, margins.left), maxX),
    y: Math.min(Math.max(position.y, margins.top), maxY)
  };
}

function getDefaultPlayerPosition(mode: ActiveMode, size: { width: number; height: number }) {
  if (typeof window === "undefined") {
    return { x: player_edge_margin, y: player_edge_margin };
  }

  const fallbackSize = {
    width: size.width > 0 ? size.width : mode === "video" ? 680 : 520,
    height: size.height > 0 ? size.height : mode === "video" ? 500 : 240
  };
  const margins = getPlayerViewportMargins();

  return clampPlayerPosition(
    {
      x: window.innerWidth - fallbackSize.width - margins.right,
      y: window.innerHeight - fallbackSize.height - margins.bottom
    },
    fallbackSize
  );
}

function PlayerIcon({ name }: { name: "play" | "pause" | "previous" | "next" | "shuffle" | "repeatOff" | "repeatOne" | "repeatAll" | "volume" | "mute" | "fullscreen" | "close" | "drag" }) {
  const iconProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.35
  };

  if (name === "play") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /></svg>;
  }
  if (name === "pause") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5h3.2v13H8zM13.8 5.5H17v13h-3.2z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" /></svg>;
  }
  if (name === "previous") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M6.5 6v12M17.5 6.5 9 12l8.5 5.5z" /></svg>;
  }
  if (name === "next") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M17.5 6v12M6.5 6.5 15 12l-8.5 5.5z" /></svg>;
  }
  if (name === "shuffle") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M4 7h3.4c2.7 0 4.1 10 7 10H20M17 14l3 3-3 3M4 17h3.4c1.1 0 2-.8 2.8-2M14.2 9c.8-1.1 1.8-2 3.2-2H20M17 4l3 3-3 3" /></svg>;
  }
  if (name === "repeatOne") {
    return <svg className="repeat_one_icon" viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M6.5 8h9.2l-2-2M17.5 8l-3.8 3.8M17.5 16h-9.2l2 2M6.5 16l3.8-3.8" /><circle className="repeat_one_badge" cx="17.4" cy="6.6" r="5.9" /><text className="repeat_one_digit" x="17.4" y="9.35" textAnchor="middle">1</text></svg>;
  }
  if (name === "repeatAll") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M6.5 8h9.2l-2-2M17.5 8l-3.8 3.8M17.5 16h-9.2l2 2M6.5 16l3.8-3.8" /></svg>;
  }
  if (name === "repeatOff") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M6.5 8h6.8M17.5 8l-3.8 3.8M17.5 16h-6.8M6.5 16l3.8-3.8M4 4l16 16" /></svg>;
  }
  if (name === "volume") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M4 9.5v5h4l5 4v-13l-5 4zM16 9c1 .8 1.5 1.8 1.5 3s-.5 2.2-1.5 3M18.8 6.4A7.5 7.5 0 0 1 21 12a7.5 7.5 0 0 1-2.2 5.6" /></svg>;
  }
  if (name === "mute") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M4 9.5v5h4l5 4v-13l-5 4zM17 9l4 4M21 9l-4 4" /></svg>;
  }
  if (name === "fullscreen") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M8.5 4H4v4.5M15.5 4H20v4.5M20 15.5V20h-4.5M4 15.5V20h4.5" /></svg>;
  }
  if (name === "drag") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M7 7h10M7 12h10M7 17h10" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...iconProps} d="M6 6l12 12M18 6 6 18" /></svg>;
}

export function MediaPlayerProvider({ children }: { children: ReactNode }) {
  const { markMediaContentUnavailable } = usePalate();
  const playerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [queues, setQueues] = useState<Record<PlayerMediaKind, MediaPlayerTrack[]>>({ audio: [], video: [] });
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);
  const [currentTrack, setCurrentTrack] = useState<MediaPlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition | null>(null);
  const [volume, setVolume] = useState(default_volume);
  const [muted, setMuted] = useState(false);
  const [fullscreenFallback, setFullscreenFallback] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [dragging, setDragging] = useState(false);
  const playIntentRef = useRef<"play" | "pause" | null>(null);
  const userPausedRef = useRef(false);
  const playAttemptInFlightRef = useRef(false);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const currentTrackId = currentTrack?.id ?? null;
  const activeQueue = useMemo(() => activeMode ? queues[activeMode] : [], [activeMode, queues]);
  const currentIndex = useMemo(() => activeQueue.findIndex((track) => track.id === currentTrackId), [activeQueue, currentTrackId]);

  const getActiveElement = useCallback(() => {
    return activeMode === "video" ? videoRef.current : activeMode === "audio" ? audioRef.current : null;
  }, [activeMode]);

  const setQueueFromMedia = useCallback((media: MediaRecord[]) => {
    const nextQueues: Record<PlayerMediaKind, MediaPlayerTrack[]> = { audio: [], video: [] };
    media.forEach((item) => {
      const track = getPlayableTrack(item);
      if (track) nextQueues[track.kind].push(track);
    });
    setQueues(nextQueues);
  }, []);

  const canPlayMedia = useCallback((media: MediaRecord) => getPlayableTrack(media) !== null, []);

  const pauseInactiveElement = useCallback((kind: PlayerMediaKind, clearSource = false) => {
    const inactiveElement = kind === "audio" ? videoRef.current : audioRef.current;
    if (!inactiveElement) return;
    inactiveElement.pause();
    if (clearSource) {
      inactiveElement.removeAttribute("src");
      inactiveElement.load();
    }
  }, []);

  const playTrack = useCallback((track: MediaPlayerTrack, reason = "playTrack") => {
    const previousMode = activeMode;
    const previousTrack = currentTrack;
    debugPlayerTransition({
      reason,
      requestedMediaId: track.mediaId,
      requestedTitle: track.title,
      requestedKind: track.kind,
      activeModeBefore: previousMode,
      currentItemBefore: previousTrack ? { id: previousTrack.id, title: previousTrack.title, kind: previousTrack.kind } : null
    });
    pauseInactiveElement(track.kind, true);
    playIntentRef.current = "play";
    userPausedRef.current = false;
    playAttemptInFlightRef.current = false;
    setFullscreenFallback(false);
    setActiveMode(track.kind);
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    setDuration(0);
    setLoading(true);
    setBuffering(false);
    setPlaybackError(null);
    debugPlayerTransition({
      reason: `${reason}:applied`,
      activeModeAfter: track.kind,
      currentItemAfter: { id: track.id, title: track.title, kind: track.kind }
    });
  }, [activeMode, currentTrack, pauseInactiveElement]);

  const playMedia = useCallback((media: MediaRecord) => {
    const track = getPlayableTrack(media);
    if (!track) return;
    playTrack(track, "explicit playMedia click");
  }, [playTrack]);

  const getAdjacentTrack = useCallback((direction: 1 | -1, wrap: boolean) => {
    if (!activeMode) return null;
    const queue = queues[activeMode];
    if (queue.length === 0) return null;
    if (shuffle && queue.length > 1) {
      const candidates = queue.filter((track) => track.id !== currentTrackId);
      return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    }
    const baseIndex = currentIndex >= 0 ? currentIndex : direction === 1 ? -1 : queue.length;
    const nextIndex = baseIndex + direction;
    if (nextIndex >= 0 && nextIndex < queue.length) return queue[nextIndex];
    return wrap ? queue[direction === 1 ? 0 : queue.length - 1] : null;
  }, [activeMode, currentIndex, currentTrackId, queues, shuffle]);

  const stop = useCallback(() => {
    playIntentRef.current = null;
    userPausedRef.current = false;
    playAttemptInFlightRef.current = false;
    setFullscreenFallback(false);
    setDragging(false);
    dragStateRef.current = null;
    audioRef.current?.pause();
    videoRef.current?.pause();
    audioRef.current?.removeAttribute("src");
    videoRef.current?.removeAttribute("src");
    setCurrentTrack(null);
    setActiveMode(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setLoading(false);
    setBuffering(false);
    setPlaybackError(null);
  }, []);

  const playNext = useCallback((wrap = repeatMode === "all") => {
    const nextTrack = getAdjacentTrack(1, wrap);
    if (nextTrack) {
      playTrack(nextTrack, "next within active mode");
      return;
    }
    stop();
  }, [getAdjacentTrack, playTrack, repeatMode, stop]);

  const playPrevious = useCallback(() => {
    const previousTrack = getAdjacentTrack(-1, repeatMode === "all");
    if (previousTrack) playTrack(previousTrack, "previous within active mode");
  }, [getAdjacentTrack, playTrack, repeatMode]);

  const evaluatePlaybackBuffer = useCallback((reason: string) => {
    const activeElement = getActiveElement();
    if (!activeElement || !currentTrack) return;
    if (playAttemptInFlightRef.current) return;

    const startThreshold = minStartBufferSeconds[currentTrack.kind];
    const resumeThreshold = minResumeBufferSeconds[currentTrack.kind];
    const bufferAhead = getBufferedAhead(activeElement);
    const readyEnough = activeElement.readyState >= HTMLMediaElement.HAVE_METADATA && bufferAhead >= (isPlaying && !loading ? resumeThreshold : startThreshold);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[Palate media buffer]", {
        reason,
        mediaId: currentTrack.mediaId,
        kind: currentTrack.kind,
        currentTime: activeElement.currentTime,
        duration: activeElement.duration,
        bufferAhead,
        readyEnough,
        loading,
        buffering,
        userPaused: userPausedRef.current,
        playIntent: playIntentRef.current
      });
    }

    if (playIntentRef.current !== "play") return;
    if (userPausedRef.current) return;

    setDuration(getFiniteMediaTime(activeElement.duration));
    setProgress(getFiniteMediaTime(activeElement.currentTime));

    if (bufferAhead < startThreshold) {
      setLoading(true);
      setBuffering(true);
      return;
    }

    if (buffering && bufferAhead < resumeThreshold) {
      setLoading(false);
      setBuffering(true);
      if (!activeElement.paused) {
        activeElement.pause();
      }
      return;
    }

    if (activeElement.paused && readyEnough) {
      setLoading(false);
      setBuffering(false);
      playAttemptInFlightRef.current = true;
      void activeElement.play()
        .then(() => {
          playAttemptInFlightRef.current = false;
          setIsPlaying(true);
          setLoading(false);
          setBuffering(false);
        })
        .catch(() => {
          playAttemptInFlightRef.current = false;
          const retryBufferAhead = getBufferedAhead(activeElement);
          const retryThreshold = minResumeBufferSeconds[currentTrack.kind];
          if (!userPausedRef.current && retryBufferAhead < retryThreshold) {
            setIsPlaying(true);
            setLoading(false);
            setBuffering(true);
            return;
          }
          setIsPlaying(false);
          setLoading(false);
          setBuffering(false);
          setPlaybackError("Cannot play this media.");
        });
      return;
    }

    setLoading(false);
    setBuffering(false);
  }, [buffering, currentTrack, getActiveElement, isPlaying, loading]);

  const togglePlayback = useCallback(() => {
    if (!currentTrack) return;
    if (isPlaying) {
      playIntentRef.current = "pause";
      userPausedRef.current = true;
      playAttemptInFlightRef.current = false;
      getActiveElement()?.pause();
      setIsPlaying(false);
      setLoading(false);
      setBuffering(false);
      return;
    }
    const activeElement = getActiveElement();
    if (!activeElement) return;
    playIntentRef.current = "play";
    userPausedRef.current = false;
    playAttemptInFlightRef.current = false;
    setPlaybackError(null);
    setLoading(true);
    setIsPlaying(true);
    setBuffering(false);
    activeElement.load();
    evaluatePlaybackBuffer("togglePlayback");
  }, [currentTrack, evaluatePlaybackBuffer, getActiveElement, isPlaying]);

  const handleEnded = useCallback(() => {
    const activeElement = getActiveElement();
    if (!activeElement) return;
    if (repeatMode === "one") {
      playIntentRef.current = "play";
      userPausedRef.current = false;
      playAttemptInFlightRef.current = false;
      activeElement.currentTime = 0;
      void activeElement.play();
      return;
    }
    playIntentRef.current = null;
    playAttemptInFlightRef.current = false;
    playNext(repeatMode === "all");
  }, [getActiveElement, playNext, repeatMode]);

  const handleError = useCallback(() => {
    playIntentRef.current = null;
    playAttemptInFlightRef.current = false;
    setLoading(false);
    setIsPlaying(false);
    setBuffering(false);
    setPlaybackError("Cannot play this media.");
    if (currentTrack && process.env.NODE_ENV !== "production") {
      const activeElement = getActiveElement();
      console.debug("[Palate media element error]", {
        mediaId: currentTrack.mediaId,
        resolvedReadUrl: currentTrack.source,
        errorCode: activeElement?.error?.code ?? null
      });
    }

    if (currentTrack) {
      void preflightShelbyReadUrl(currentTrack.source).then((result) => {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[Palate media error preflight]", {
            mediaId: currentTrack.mediaId,
            resolvedReadUrl: currentTrack.source,
            result
          });
        }
        if (result === "missing") {
          markMediaContentUnavailable(currentTrack.mediaId);
        }
      });
    }

  }, [currentTrack, getActiveElement, markMediaContentUnavailable]);

  const handleLoadedMetadata = useCallback(() => {
    const activeElement = getActiveElement();
    setDuration(getFiniteMediaTime(activeElement?.duration));
    setProgress(getFiniteMediaTime(activeElement?.currentTime));
    evaluatePlaybackBuffer("loadedmetadata");
  }, [evaluatePlaybackBuffer, getActiveElement]);

  const handleTimeUpdate = useCallback(() => {
    const activeElement = getActiveElement();
    setProgress(getFiniteMediaTime(activeElement?.currentTime));
    if (activeElement && currentTrack) {
      const bufferAhead = getBufferedAhead(activeElement);
      const resumeThreshold = minResumeBufferSeconds[currentTrack.kind];
      if (!userPausedRef.current && playIntentRef.current === "play" && (bufferAhead < resumeThreshold || activeElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)) {
        setLoading(false);
        setBuffering(true);
        if (!activeElement.paused) {
          activeElement.pause();
        }
      }
    }
  }, [currentTrack, getActiveElement]);

  const handleWaiting = useCallback(() => {
    if (!currentTrack) return;
    setLoading(false);
    setBuffering(true);
  }, [currentTrack]);

  const handleStalled = useCallback(() => {
    if (!currentTrack) return;
    setLoading(false);
    setBuffering(true);
  }, [currentTrack]);

  const handlePlaying = useCallback(() => {
    const activeElement = getActiveElement();
    setLoading(false);
    setBuffering(false);
    setIsPlaying(true);
    playAttemptInFlightRef.current = false;
    setPlaybackError(null);
    setDuration(getFiniteMediaTime(activeElement?.duration));
    setProgress(getFiniteMediaTime(activeElement?.currentTime));
  }, [getActiveElement]);

  const handleCanPlay = useCallback(() => {
    if (!currentTrack) return;
    evaluatePlaybackBuffer("canplay");
  }, [currentTrack, evaluatePlaybackBuffer]);

  const handleProgress = useCallback(() => {
    if (!currentTrack) return;
    const activeElement = getActiveElement();
    if (!activeElement) return;
    const bufferAhead = getBufferedAhead(activeElement);
    const threshold = playIntentRef.current === "play" && !userPausedRef.current && (!activeElement.paused || buffering)
      ? minResumeBufferSeconds[currentTrack.kind]
      : minStartBufferSeconds[currentTrack.kind];
    if (playIntentRef.current === "play" && !userPausedRef.current && bufferAhead >= threshold) {
      evaluatePlaybackBuffer("progress");
      return;
    }
    if (playIntentRef.current === "play" && !userPausedRef.current && bufferAhead < threshold) {
      setLoading(playIntentRef.current === "play");
      setBuffering(true);
      if (!activeElement.paused) {
        activeElement.pause();
      }
    }
  }, [buffering, currentTrack, evaluatePlaybackBuffer, getActiveElement]);

  const seek = useCallback((seconds: number) => {
    const activeElement = getActiveElement();
    if (!activeElement || !Number.isFinite(seconds)) return;
    const safeDuration = getFiniteMediaTime(activeElement.duration) || duration;
    activeElement.currentTime = Math.max(0, Math.min(seconds, safeDuration || seconds));
    setProgress(activeElement.currentTime);
  }, [duration, getActiveElement]);

  const changeVolume = useCallback((value: number) => {
    const nextVolume = Math.max(0, Math.min(1, value));
    setVolume(nextVolume);
    if (nextVolume > 0) setMuted(false);
    if (audioRef.current) audioRef.current.volume = nextVolume;
    if (videoRef.current) videoRef.current.volume = nextVolume;
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((current) => !current);
  }, []);

  const applyPlayerPosition = useCallback((nextPosition: PlayerPosition) => {
    const element = playerRef.current;
    if (!element || typeof window === "undefined") {
      setPlayerPosition(nextPosition);
      return;
    }

    const rect = element.getBoundingClientRect();
    setPlayerPosition(clampPlayerPosition(nextPosition, { width: rect.width, height: rect.height }));
  }, []);

  const startDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, input, select, textarea, label")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const element = playerRef.current;
    if (!element || typeof window === "undefined") return;

    event.preventDefault();

    const rect = element.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX,
      offsetY
    };
    setDragging(true);

    const handleMove = (moveEvent: PointerEvent) => {
      if (!dragStateRef.current || moveEvent.pointerId !== dragStateRef.current.pointerId) return;
      applyPlayerPosition({
        x: moveEvent.clientX - dragStateRef.current.offsetX,
        y: moveEvent.clientY - dragStateRef.current.offsetY
      });
    };

    const handleEnd = (endEvent: PointerEvent) => {
      if (dragStateRef.current && endEvent.pointerId !== dragStateRef.current.pointerId) return;
      dragStateRef.current = null;
      setDragging(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  }, [applyPlayerPosition]);

  const toggleFullscreen = useCallback(async () => {
    const target = videoRef.current;
    if (!target) return;

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
        setFullscreenFallback(false);
        return;
      }

      if (target.requestFullscreen) {
        await target.requestFullscreen();
        setFullscreenFallback(false);
        return;
      }

      setFullscreenFallback((current) => !current);
    } catch {
      setFullscreenFallback((current) => !current);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(player_position_storage_key);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PlayerPosition>;
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPlayerPosition({ x: parsed.x, y: parsed.y });
        }
      }
    } catch {
      // Ignore malformed saved positions.
    }
  }, []);

  useEffect(() => {
    const activeElement = getActiveElement();
    if (!currentTrack || !activeElement) return;
    if (activeElement.src !== currentTrack.source) {
      activeElement.src = currentTrack.source;
      activeElement.currentTime = 0;
      activeElement.load();
      setLoading(true);
    }
    activeElement.volume = volume;
    activeElement.muted = muted;
    setDuration(getFiniteMediaTime(activeElement.duration));
    setProgress(getFiniteMediaTime(activeElement.currentTime));
  }, [currentTrack, getActiveElement, isPlaying, muted, volume]);

  useEffect(() => {
    if (!currentTrack || typeof window === "undefined") return;
    const element = playerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    setPlayerPosition((current) => clampPlayerPosition(current ?? getDefaultPlayerPosition(activeMode, rect), { width: rect.width, height: rect.height }));
  }, [activeMode, currentTrack]);

  useEffect(() => {
    if (!playerPosition || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(player_position_storage_key, JSON.stringify(playerPosition));
    } catch {
      // Ignore storage write errors.
    }
  }, [playerPosition]);

  useEffect(() => {
    if (!playerPosition || typeof window === "undefined") return undefined;

    function handleResize() {
      const element = playerRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      setPlayerPosition((current) => current ? clampPlayerPosition(current, { width: rect.width, height: rect.height }) : current);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [playerPosition]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (!currentTrack || playIntentRef.current !== "play" || userPausedRef.current) return undefined;

    const interval = window.setInterval(() => {
      evaluatePlaybackBuffer("poll");
    }, 280);

    return () => window.clearInterval(interval);
  }, [currentTrack, evaluatePlaybackBuffer]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (document.fullscreenElement !== videoRef.current) {
        setFullscreenFallback(false);
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const progressMax = duration > 0 ? duration : 1;
  const progressValue = duration > 0 ? Math.min(progress, duration) : 0;
  const playerStyle = playerPosition ? {
    top: `${playerPosition.y}px`,
    left: `${playerPosition.x}px`,
    right: "auto",
    bottom: "auto"
  } : undefined;

  const contextValue = useMemo<MediaPlayerContextValue>(() => ({
    currentTrack,
    currentTrackId,
    isPlaying,
    canPlayMedia,
    playMedia,
    setQueueFromMedia,
    togglePlayback
  }), [canPlayMedia, currentTrack, currentTrackId, isPlaying, playMedia, setQueueFromMedia, togglePlayback]);

  return (
    <MediaPlayerContext.Provider value={contextValue}>
      {children}
      <div
        ref={playerRef}
        className={`global_media_player ${currentTrack ? "visible" : ""} ${activeMode === "video" ? "video_mode" : "audio_mode"} ${fullscreenFallback ? "video_fullscreen_fallback" : ""} ${dragging ? "dragging" : ""}`}
        aria-live="polite"
        style={playerStyle}
      >
        <div className="global_media_header" onPointerDown={startDrag}>
          <div className="global_media_header_main">
            <span className="global_media_drag_handle" aria-hidden="true"><PlayerIcon name="drag" /></span>
            <div className="global_media_header_text">
              <span>{activeMode === "video" ? "Video" : "Audio"}</span>
              <strong title={currentTrack?.title ?? "Untitled media"}>{currentTrack?.title ?? "Untitled media"}</strong>
            </div>
          </div>
          <div className="global_media_header_actions">
            {activeMode === "video" ? (
              <button aria-label="Fullscreen video player" className="media_icon_button" onClick={toggleFullscreen} type="button"><PlayerIcon name="fullscreen" /></button>
            ) : null}
            <button aria-label="Close player" className="media_icon_button" onClick={stop} type="button"><PlayerIcon name="close" /></button>
          </div>
        </div>
        {activeMode !== "video" ? (
          <audio
            onCanPlay={handleCanPlay}
            onDurationChange={handleLoadedMetadata}
            onEnded={handleEnded}
            onError={handleError}
            onLoadedMetadata={handleLoadedMetadata}
            onPlaying={handlePlaying}
            onProgress={handleProgress}
            onTimeUpdate={handleTimeUpdate}
            onWaiting={handleWaiting}
            onStalled={handleStalled}
            ref={audioRef}
          />
        ) : null}
        {activeMode === "video" ? (
          <div className="global_media_stage">
            <video
              className="global_media_video"
              onCanPlay={handleCanPlay}
              onDurationChange={handleLoadedMetadata}
              onEnded={handleEnded}
              onError={handleError}
              onLoadedMetadata={handleLoadedMetadata}
              onPlaying={handlePlaying}
              onProgress={handleProgress}
              onTimeUpdate={handleTimeUpdate}
              onWaiting={handleWaiting}
              onStalled={handleStalled}
              playsInline
              ref={videoRef}
            />
          </div>
        ) : null}
        <div className="global_media_meta">
          <span>{activeMode === "video" ? "Video" : activeMode === "audio" ? "Audio" : "Media"}</span>
          {loading ? <small>Loading media…</small> : null}
          {buffering ? <small>Buffering…</small> : null}
          {playbackError ? <small className="global_media_error">{playbackError}</small> : null}
        </div>
        <div className="global_media_controls">
          <button aria-label="Previous track" className="media_icon_button" onClick={playPrevious} type="button"><PlayerIcon name="previous" /></button>
          <button aria-label={isPlaying ? "Pause" : "Play"} className="media_icon_button primary" onClick={togglePlayback} type="button"><PlayerIcon name={isPlaying ? "pause" : "play"} /></button>
          <button aria-label="Next track" className="media_icon_button" onClick={() => playNext()} type="button"><PlayerIcon name="next" /></button>
          <button aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"} className={`media_icon_button ${shuffle ? "active" : ""}`} onClick={() => setShuffle((current) => !current)} type="button"><PlayerIcon name="shuffle" /></button>
          <button
            aria-label={`Repeat mode ${repeatMode}`}
            className={`media_icon_button ${repeatMode !== "off" ? "active" : ""}`}
            onClick={() => setRepeatMode((current) => current === "off" ? "one" : current === "one" ? "all" : "off")}
            type="button"
          >
            <PlayerIcon name={repeatMode === "one" ? "repeatOne" : repeatMode === "all" ? "repeatAll" : "repeatOff"} />
          </button>
          <button aria-label={muted ? "Unmute" : "Mute"} className={`media_icon_button ${muted ? "active" : ""}`} onClick={toggleMute} type="button"><PlayerIcon name={muted ? "mute" : "volume"} /></button>
        </div>
        <div className="global_media_progress">
          <span>{formatSeconds(progress)}</span>
          <input aria-label="Media progress" max={progressMax} min={0} onChange={(event) => seek(Number(event.target.value))} step={0.1} type="range" value={progressValue} />
          <span>{formatSeconds(duration)}</span>
        </div>
        <label className="global_media_volume">
          <span>Vol</span>
          <input aria-label="Media volume" max={1} min={0} onChange={(event) => changeVolume(Number(event.target.value))} step={0.01} type="range" value={volume} />
        </label>
      </div>
    </MediaPlayerContext.Provider>
  );
}

export function useMediaPlayer() {
  const context = useContext(MediaPlayerContext);
  if (!context) {
    throw new Error("useMediaPlayer must be used inside MediaPlayerProvider");
  }
  return context;
}
