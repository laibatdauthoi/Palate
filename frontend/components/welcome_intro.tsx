"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export function WelcomeIntro() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showLogo, setShowLogo] = useState(true);

  const dismiss = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 360);
  }, []);

  useEffect(() => {
    setVisible(true);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(dismiss, reducedMotion ? 900 : 3800);

    return () => window.clearTimeout(timer);
  }, [dismiss]);

  useEffect(() => {
    if (!visible) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dismiss, visible]);

  if (!visible) return null;

  return (
    <button
      aria-label="Skip Palate intro"
      className={`welcome_intro ${leaving ? "welcome_intro_leaving" : ""}`}
      onClick={dismiss}
      type="button"
    >
      <span className="welcome_intro_aura" />
      <span className="welcome_intro_ring welcome_intro_ring_outer" />
      <span className="welcome_intro_ring welcome_intro_ring_inner" />
      <span className="welcome_intro_ring welcome_intro_ring_flash" />
      <span className="welcome_intro_particles" />
      <span className="welcome_intro_sweep" />
      <span className="welcome_intro_core">
        {showLogo ? (
          <Image
            alt=""
            className="welcome_intro_logo"
            height={132}
            onError={() => setShowLogo(false)}
            src="/brand/palate_logo.png"
            width={132}
          />
        ) : null}
        <span className="welcome_intro_wordmark">Palate</span>
      </span>
    </button>
  );
}
