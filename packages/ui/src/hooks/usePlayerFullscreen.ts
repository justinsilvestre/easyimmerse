import { type RefObject, useCallback, useSyncExternalStore } from "react";

/** Tells whether the target fills the screen, and returns a function that enters or leaves fullscreen for it. */
export function usePlayerFullscreen(target: RefObject<HTMLElement | null>) {
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreenChanges,
    () =>
      target.current !== null && document.fullscreenElement === target.current,
    () => false,
  );
  const toggleFullscreen = useCallback(() => {
    const element = target.current;
    if (document.fullscreenElement)
      document.exitFullscreen().catch(ignoreRefusal);
    // iOS Safari offers fullscreen only for video elements. Elsewhere the page stays as it is.
    else if (typeof element?.requestFullscreen === "function")
      element.requestFullscreen().catch(ignoreRefusal);
  }, [target]);
  return { isFullscreen, toggleFullscreen };
}

function subscribeToFullscreenChanges(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

/** Browsers refuse fullscreen outside a user gesture or inside a frame that disallows it. The page then stays as it is. */
function ignoreRefusal() {}
