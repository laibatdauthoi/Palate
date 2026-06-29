"use client";

import { useEffect } from "react";

// Calibrated to the currently approved Home viewport so Stage 2 can preserve
// the existing composition when scale variables are consumed later.
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 678;
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
      const layoutMode = viewportWidth >= 768 ? "desktop-fit" : "mobile";
      const layoutModeCode = layoutMode === "desktop-fit" ? "1" : "3";
      const scaleX = viewportWidth / DESIGN_WIDTH;
      const scaleY = viewportHeight / DESIGN_HEIGHT;
      const scaleUniform = Math.min(scaleX, scaleY);
      const uiScale = clamp(scaleUniform, MIN_SCALE, MAX_SCALE);
      const safeGutterX = Math.max((viewportWidth - DESIGN_WIDTH * uiScale) / 2, 0);
      const safeGutterY = Math.max((viewportHeight - DESIGN_HEIGHT * uiScale) / 2, 0);
      const rootElement = document.documentElement;
      const rootStyle = rootElement.style;

      rootStyle.setProperty("--viewport-width", `${viewportWidth}px`);
      rootStyle.setProperty("--viewport-height", `${viewportHeight}px`);
      rootStyle.setProperty("--layout-design-width", `${DESIGN_WIDTH}`);
      rootStyle.setProperty("--layout-design-height", `${DESIGN_HEIGHT}`);
      rootStyle.setProperty("--ui-scale-x", scaleX.toFixed(4));
      rootStyle.setProperty("--ui-scale-y", scaleY.toFixed(4));
      rootStyle.setProperty("--ui-scale-uniform", scaleUniform.toFixed(4));
      rootStyle.setProperty("--ui-scale", uiScale.toFixed(4));
      rootStyle.setProperty("--safe-gutter-x", `${safeGutterX.toFixed(2)}px`);
      rootStyle.setProperty("--safe-gutter-y", `${safeGutterY.toFixed(2)}px`);
      rootStyle.setProperty("--layout-mode-code", layoutModeCode);
      rootElement.dataset.layoutMode = layoutMode;
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
