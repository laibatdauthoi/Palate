"use client";

import { useEffect } from "react";

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 864;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.18;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function LayoutScaleController() {
  useEffect(() => {
    let frameId = 0;

    const applyLayoutMetrics = () => {
      frameId = 0;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rawScale = Math.min(viewportWidth / DESIGN_WIDTH, viewportHeight / DESIGN_HEIGHT);
      const uiScale = clamp(rawScale, MIN_SCALE, MAX_SCALE);
      const safeGutterX = Math.max((viewportWidth - DESIGN_WIDTH * uiScale) / 2, 0);
      const safeGutterY = Math.max((viewportHeight - DESIGN_HEIGHT * uiScale) / 2, 0);
      const rootStyle = document.documentElement.style;

      rootStyle.setProperty("--viewport-width", `${viewportWidth}px`);
      rootStyle.setProperty("--viewport-height", `${viewportHeight}px`);
      rootStyle.setProperty("--layout-design-width", `${DESIGN_WIDTH}`);
      rootStyle.setProperty("--layout-design-height", `${DESIGN_HEIGHT}`);
      rootStyle.setProperty("--ui-scale", uiScale.toFixed(4));
      rootStyle.setProperty("--safe-gutter-x", `${safeGutterX.toFixed(2)}px`);
      rootStyle.setProperty("--safe-gutter-y", `${safeGutterY.toFixed(2)}px`);
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
