"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getShelbyDisplaySource } from "@/services/shelby_service";
import type { MediaRecord } from "@/types/palate";
import { detectMediaKindFromMetadata, isMediaCategoryCompatible } from "@/utils/media_file_validation";
import { usePalate } from "./palate_provider";

type RepeatMode = "off" | "one" | "all";
type PlayerMediaKind = "audio" | "video";

type MediaPlayerTrack = {
  id: number;
  mediaId: number;
  title: string;
  source: string;
  kind: PlayerMediaKind;
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

function isHttpSource(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:");
}

function getPlayableTrack(media: MediaRecord): MediaPlayerTrack | null {
  const source = getShelbyDisplaySource(media);
  const kind = detectMediaKindFromMetadata(media.mimeType, media.originalFileName);

  if (kind !== "audio" && kind !== "video") return null;
  if (!source || !isHttpSource(source)) return null;
  if (media.source !== "palate") return null;
  if (!isMediaCategoryCompatible(media.category, media.mimeType, media.originalFileName)) return null;
  if ((media.storageStatus ?? "uploaded") !== "uploaded") return null;
  if (media.status === "pending_registration" || media.status === "registration_failed") return null;
  if (media.deletePending || media.contentUnavailable || media.shelbyCleanupRequired) return null;

  return {
    id: media.id,
    mediaId: media.palateMediaId ?? media.id,
    title: media.title,
    source,
    kind
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

function PlayerIcon({ name }: { name: "play" | "pause" | "previous" | "next" | "shuffle" | "repeatOff" | "repeatOne" | "repeatAll" | "close" }) {
  if (name === "play") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
  }
  if (name === "pause") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>;
  }
  if (name === "previous") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM9 12l9 7V5z" /></svg>;
  }
  if (name === "next") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM6 5v14l9-7z" /></svg>;
  }
  if (name === "shuffle") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5h-2V6.4l-4.7 4.7-1.4-1.4L17.6 5H16zM4 7h3.3l10 10H21v2h-4.5l-10-10H4zm0 10h3.3l3.1-3.1 1.4 1.4L8.1 19H4zm15-3h2v5h-5v-2h1.6l-3.2-3.2 1.4-1.4z" /></svg>;
  }
  if (name === "repeatOne") {
    return <svg className="repeat_one_icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h9.2l-2-2L15.6 3.6 20 8l-4.4 4.4-1.4-1.4 2-2H7v3H5V7zm12 5v5H7.8l2 2-1.4 1.4L4 16l4.4-4.4L9.8 13l-2 2H17v-3z" /><circle className="repeat_one_badge" cx="17" cy="7" r="5.2" /><path className="repeat_one_digit" d="M16.4 10V5.2l-1.2.7-.6-1.1 2.1-1.2h1.3V10z" /></svg>;
  }
  if (name === "repeatAll") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h9.2l-2-2L15.6 3.6 20 8l-4.4 4.4-1.4-1.4 2-2H7v3H5V7zm12 5v5H7.8l2 2-1.4 1.4L4 16l4.4-4.4L9.8 13l-2 2H17v-3z" /></svg>;
  }
  if (name === "repeatOff") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.3 2 22 20.7 20.7 22l-3-3H7.8l2 2-1.4 1.4L4 18l4.4-4.4L9.8 15l-2 2h7.9l-3-3H5V7h.7L2 3.3zm7 5h5.9l-2-2 1.4-1.4L20 8l-3.4 3.4-1.4-1.4 1-1h-3.9zM19 12h2v5h-1.7L17 14.7z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4zm11.2 0L19 6.4 6.4 19 5 17.6 17.6 5z" /></svg>;
}

export function MediaPlayerProvider({ children }: { children: ReactNode }) {
  const { markMediaContentUnavailable } = usePalate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [queue, setQueue] = useState<MediaPlayerTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<MediaPlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(default_volume);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);

  const currentTrackId = currentTrack?.id ?? null;
  const currentIndex = useMemo(() => queue.findIndex((track) => track.id === currentTrackId), [currentTrackId, queue]);

  const getActiveElement = useCallback(() => {
    return currentTrack?.kind === "video" ? videoRef.current : audioRef.current;
  }, [currentTrack]);

  const setQueueFromMedia = useCallback((media: MediaRecord[]) => {
    setQueue(media.map(getPlayableTrack).filter((track): track is MediaPlayerTrack => track !== null));
  }, []);

  const canPlayMedia = useCallback((media: MediaRecord) => getPlayableTrack(media) !== null, []);

  const pauseInactiveElement = useCallback((kind: PlayerMediaKind) => {
    const inactiveElement = kind === "audio" ? videoRef.current : audioRef.current;
    if (inactiveElement) inactiveElement.pause();
  }, []);

  const playTrack = useCallback((track: MediaPlayerTrack) => {
    pauseInactiveElement(track.kind);
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    setDuration(0);
    setLoading(true);
  }, [pauseInactiveElement]);

  const playMedia = useCallback((media: MediaRecord) => {
    const track = getPlayableTrack(media);
    if (!track) return;
    playTrack(track);
  }, [playTrack]);

  const getAdjacentTrack = useCallback((direction: 1 | -1, wrap: boolean) => {
    if (queue.length === 0) return null;
    if (shuffle && queue.length > 1) {
      const candidates = queue.filter((track) => track.id !== currentTrackId);
      return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    }
    const baseIndex = currentIndex >= 0 ? currentIndex : direction === 1 ? -1 : queue.length;
    const nextIndex = baseIndex + direction;
    if (nextIndex >= 0 && nextIndex < queue.length) return queue[nextIndex];
    return wrap ? queue[direction === 1 ? 0 : queue.length - 1] : null;
  }, [currentIndex, currentTrackId, queue, shuffle]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    videoRef.current?.pause();
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setLoading(false);
  }, []);

  const playNext = useCallback((wrap = repeatMode === "all") => {
    const nextTrack = getAdjacentTrack(1, wrap);
    if (nextTrack) {
      playTrack(nextTrack);
      return;
    }
    stop();
  }, [getAdjacentTrack, playTrack, repeatMode, stop]);

  const playPrevious = useCallback(() => {
    const previousTrack = getAdjacentTrack(-1, repeatMode === "all");
    if (previousTrack) playTrack(previousTrack);
  }, [getAdjacentTrack, playTrack, repeatMode]);

  const togglePlayback = useCallback(() => {
    if (!currentTrack) {
      if (queue[0]) playTrack(queue[0]);
      return;
    }
    if (isPlaying) {
      getActiveElement()?.pause();
      setIsPlaying(false);
      return;
    }
    void getActiveElement()?.play();
    setIsPlaying(true);
  }, [currentTrack, getActiveElement, isPlaying, playTrack, queue]);

  const handleEnded = useCallback(() => {
    const activeElement = getActiveElement();
    if (!activeElement) return;
    if (repeatMode === "one") {
      activeElement.currentTime = 0;
      void activeElement.play();
      return;
    }
    playNext(repeatMode === "all");
  }, [getActiveElement, playNext, repeatMode]);

  const handleError = useCallback(() => {
    setLoading(false);
    if (currentTrack) {
      markMediaContentUnavailable(currentTrack.mediaId);
    }
    if (repeatMode === "all" || currentIndex < queue.length - 1) {
      playNext(repeatMode === "all");
      return;
    }
    stop();
  }, [currentIndex, currentTrack, markMediaContentUnavailable, playNext, queue.length, repeatMode, stop]);

  const handleLoadedMetadata = useCallback(() => {
    const activeElement = getActiveElement();
    setDuration(getFiniteMediaTime(activeElement?.duration));
    setProgress(getFiniteMediaTime(activeElement?.currentTime));
    setLoading(false);
  }, [getActiveElement]);

  const handleTimeUpdate = useCallback(() => {
    setProgress(getFiniteMediaTime(getActiveElement()?.currentTime));
  }, [getActiveElement]);

  const handleWaiting = useCallback(() => {
    setLoading(true);
  }, []);

  const handlePlaying = useCallback(() => {
    const activeElement = getActiveElement();
    setLoading(false);
    setIsPlaying(true);
    setDuration(getFiniteMediaTime(activeElement?.duration));
    setProgress(getFiniteMediaTime(activeElement?.currentTime));
  }, [getActiveElement]);

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
    if (audioRef.current) audioRef.current.volume = nextVolume;
    if (videoRef.current) videoRef.current.volume = nextVolume;
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
    setDuration(getFiniteMediaTime(activeElement.duration));
    setProgress(getFiniteMediaTime(activeElement.currentTime));
    if (isPlaying) {
      void activeElement.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack, getActiveElement, isPlaying, volume]);

  const progressMax = duration > 0 ? duration : 1;
  const progressValue = duration > 0 ? Math.min(progress, duration) : 0;

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
      <div className={`global_media_player ${currentTrack ? "visible" : ""} ${currentTrack?.kind === "video" ? "video_mode" : "audio_mode"}`} aria-live="polite">
        <audio
          onDurationChange={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
          onLoadedMetadata={handleLoadedMetadata}
          onPlaying={handlePlaying}
          onTimeUpdate={handleTimeUpdate}
          onWaiting={handleWaiting}
          ref={audioRef}
        />
        {currentTrack?.kind === "video" ? (
          <video
            className="global_media_video"
            onDurationChange={handleLoadedMetadata}
            onEnded={handleEnded}
            onError={handleError}
            onLoadedMetadata={handleLoadedMetadata}
            onPlaying={handlePlaying}
            onTimeUpdate={handleTimeUpdate}
            onWaiting={handleWaiting}
            playsInline
            ref={videoRef}
          />
        ) : null}
        <div className="global_media_meta">
          <span>{currentTrack?.kind ?? "media"}</span>
          <strong>{currentTrack?.title ?? "No track selected"}</strong>
          {loading ? <small>Loading media</small> : null}
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
          <button aria-label="Close player" className="media_icon_button" onClick={stop} type="button"><PlayerIcon name="close" /></button>
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
