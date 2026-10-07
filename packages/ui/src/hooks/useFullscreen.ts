import { useEffect, useState } from "react";

/**
 * Tells whether the page fills the screen, and toggles that. Unsupported where the browser offers no fullscreen,
 * as on an iPhone, where `toggle` then does nothing.
 */
export function useFullscreen() {
  const [isFullscreen, setFullscreen] = useState(isPageFullscreen);
  useEffect(() => {
    const update = () => setFullscreen(isPageFullscreen());
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  return {
    isFullscreen,
    isSupported: document.fullscreenEnabled === true,
    toggle: () => {
      if (isPageFullscreen()) document.exitFullscreen().catch(() => undefined);
      else
        document.documentElement.requestFullscreen?.().catch(() => undefined);
    },
  };
}

function isPageFullscreen(): boolean {
  return document.fullscreenElement !== null;
}
