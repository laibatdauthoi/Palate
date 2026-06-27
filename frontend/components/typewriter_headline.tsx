"use client";

import { useEffect, useState } from "react";

type TypewriterHeadlineProps = {
  text: string;
  className?: string;
  typingDelayMs?: number;
  pauseDelayMs?: number;
};

export function TypewriterHeadline({
  text,
  className = "",
  typingDelayMs = 42,
  pauseDelayMs = 1400
}: TypewriterHeadlineProps) {
  const [visibleLength, setVisibleLength] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = () => setReducedMotion(mediaQuery.matches);
    applyPreference();

    mediaQuery.addEventListener("change", applyPreference);
    return () => mediaQuery.removeEventListener("change", applyPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setVisibleLength(text.length);
      return undefined;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    function scheduleNext(nextLength: number, delay: number) {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setVisibleLength(nextLength);
      }, delay);
    }

    if (visibleLength < text.length) {
      scheduleNext(visibleLength + 1, typingDelayMs);
    } else {
      scheduleNext(0, pauseDelayMs);
    }

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [pauseDelayMs, reducedMotion, text, typingDelayMs, visibleLength]);

  return (
    <span className={`typewriter_headline ${className}`.trim()}>
      <span aria-hidden="true" className="typewriter_headline_reserve">{text}</span>
      <span aria-hidden="true" className="typewriter_headline_live">
        <span className="typewriter_headline_typed">{reducedMotion ? text : text.slice(0, visibleLength)}</span>
        {!reducedMotion ? <span className="typewriter_cursor" /> : null}
      </span>
      <span className="typewriter_headline_a11y">{text}</span>
    </span>
  );
}
