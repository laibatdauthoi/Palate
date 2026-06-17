"use client";

import { useEffect, useState } from "react";

type LiveCountdownOptions = {
  endedLabel?: string;
};

type LiveCountdownState = {
  label: string;
  remainingSeconds: number;
  isEnded: boolean;
};

function normalizeTargetSeconds(targetTimestampMsOrSeconds: number) {
  return targetTimestampMsOrSeconds > 9999999999
    ? Math.floor(targetTimestampMsOrSeconds / 1000)
    : Math.floor(targetTimestampMsOrSeconds);
}

export function formatCountdownLabel(remainingSeconds: number, endedLabel = "Ended") {
  if (remainingSeconds <= 0) {
    return endedLabel;
  }

  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const timeLabel = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return days > 0 ? `${days}d ${timeLabel}` : timeLabel;
}

export function getLiveCountdownState(targetTimestampMsOrSeconds: number, nowMs = Date.now(), options: LiveCountdownOptions = {}): LiveCountdownState {
  const targetSeconds = normalizeTargetSeconds(targetTimestampMsOrSeconds);
  const nowSeconds = Math.floor(nowMs / 1000);
  const remainingSeconds = Math.max(0, targetSeconds - nowSeconds);
  const endedLabel = options.endedLabel ?? "Ended";

  return {
    label: formatCountdownLabel(remainingSeconds, endedLabel),
    remainingSeconds,
    isEnded: remainingSeconds <= 0
  };
}

export function useCountdownNow() {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return nowMs;
}

export function useLiveCountdown(targetTimestampMsOrSeconds: number, options: LiveCountdownOptions = {}) {
  const nowMs = useCountdownNow();
  return getLiveCountdownState(targetTimestampMsOrSeconds, nowMs, options);
}
