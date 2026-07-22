"use client";

import { useEffect } from "react";

// Calibrated to the currently approved Home viewport so Stage 2 can preserve
// the existing composition when scale variables are consumed later.
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 678;
export function LayoutScaleController() {
  useEffect(() => {
    let frameId = 0;

    const applyLayoutMetrics = () => {
      frameId = 0;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scaleX = viewportWidth / DESIGN_WIDTH;
      const scaleY = viewportHeight / DESIGN_HEIGHT;
      const scaleUniform = Math.min(scaleX, scaleY);
      const rootElement = document.documentElement;
      const rootStyle = rootElement.style;

      rootStyle.setProperty("--ui-scale-x", scaleX.toFixed(4));
      rootStyle.setProperty("--ui-scale-y", scaleY.toFixed(4));
      rootStyle.setProperty("--ui-scale-uniform", scaleUniform.toFixed(4));
    };

    const scheduleLayoutMetrics = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(applyLayoutMetrics);
    };

    scheduleLayoutMetrics();
    window.addEventListener("resize", scheduleLayoutMetrics);

    return () => {
      window.removeEventListener("resize", scheduleLayoutMetrics);

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return null;
}
