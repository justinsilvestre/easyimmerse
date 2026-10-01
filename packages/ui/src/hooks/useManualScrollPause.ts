import { useCallback, useRef } from "react";

/** How long a list stays still after the user scrolls it. */
const pauseMs = 4000;

/**
 * Tells whether a list may scroll on its own. It may not for a few seconds after the user scrolled it,
 * so that a list following its current item does not fight the user. Spread `handlers` onto the list.
 */
export function useManualScrollPause() {
  const lastManualScrollAt = useRef(Number.NEGATIVE_INFINITY);
  const noteManualScroll = useCallback(() => {
    lastManualScrollAt.current = Date.now();
  }, []);
  const isPaused = useCallback(
    () => Date.now() - lastManualScrollAt.current < pauseMs,
    [],
  );
  return {
    isPaused,
    handlers: { onWheel: noteManualScroll, onTouchMove: noteManualScroll },
  };
}
