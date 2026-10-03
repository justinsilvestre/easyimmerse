import { selectTheme } from "@easyimmerse/state";
import { useEffect, useLayoutEffect } from "react";
import { useAppSelector } from "./useAppSelector.ts";

/**
 * Marks the document with the theme to show, so that the stylesheet's colors for that theme apply.
 * Theme changes fade only after the first theme has been painted, so that opening the app does not fade.
 */
export function useApplyTheme() {
  const theme = useAppSelector(selectTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(enableThemeTransitionsAfterPaint, []);
}

/** Waits two frames so that the browser paints the first theme without a transition before transitions are enabled. */
function enableThemeTransitionsAfterPaint() {
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      document.documentElement.dataset.themeTransitions = "";
    });
  });
  return () => cancelAnimationFrame(frame);
}
