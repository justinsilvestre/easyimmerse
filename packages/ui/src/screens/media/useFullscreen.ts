import { useSyncExternalStore } from "react";

/**
 * Tells whether the page fills the screen, and toggles that. Unsupported where the browser offers no fullscreen,
 * as on an iPhone, where `toggle` then does nothing.
 */
export function useFullscreen() {
  return {
    isFullscreen: useSyncExternalStore(
      subscribeToFullscreenChange,
      isPageFullscreen,
      () => false,
    ),
    isSupported: document.fullscreenEnabled === true,
    toggle: toggleFullscreen,
  };
}

function subscribeToFullscreenChange(onChange: () => void): () => void {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

/** Reads a browser without the Fullscreen API, where the property is undefined, as not fullscreen. */
function isPageFullscreen(): boolean {
  return document.fullscreenElement != null;
}

function toggleFullscreen(): void {
  if (isPageFullscreen()) document.exitFullscreen().catch(() => undefined);
  else document.documentElement.requestFullscreen?.().catch(() => undefined);
}
