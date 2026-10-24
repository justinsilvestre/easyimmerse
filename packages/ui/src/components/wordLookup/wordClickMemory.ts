import { doubleClickMs } from "./gestureTiming.ts";
import { createTimer } from "./timer.ts";
import type { WordHit } from "./useWordGestures.ts";

/** Where a click landed in the viewport. */
export type ClickPoint = { x: number; y: number };

/** The first click of what may become a double-click: the word it landed on, and what a double-click on that word does. */
export type FirstClick = {
  hit: WordHit;
  point: ClickPoint;
  onDoubleClick: ((hit: WordHit) => void) | undefined;
};

/** How far apart the two taps of a double tap may land. */
const doubleTapSlopPx = 24;

/**
 * Keeps the first click of what may become a double-click, for the double-click interval.
 * The browser counts clicks for the pointer, not for a word, so one memory serves the whole app:
 * a second click may land on another word, or another text, when the first one changed what lies under the pointer.
 */
export function createWordClickMemory() {
  let firstClick: FirstClick | null = null;
  const expiry = createTimer();
  const forget = () => {
    firstClick = null;
    expiry.cancel();
  };
  const take = (): FirstClick | null => {
    const click = firstClick;
    forget();
    return click;
  };
  return {
    remember(click: FirstClick): void {
      firstClick = click;
      expiry.restart(doubleClickMs, forget);
    },
    /** Returns the remembered first click, once. */
    take,
    /** Drops the remembered click, as when a click lands on no word. */
    forget,
    /**
     * Returns, once, the first tap that a tap at `point` makes a double tap:
     * a tap at about the same place, on a word still on the page.
     */
    takeDoubleTap(point: ClickPoint): FirstClick | null {
      const click = firstClick;
      if (click?.hit.input !== "touch" || !click.hit.element.isConnected)
        return null;
      const distance = Math.hypot(
        point.x - click.point.x,
        point.y - click.point.y,
      );
      return distance > doubleTapSlopPx ? null : take();
    },
  };
}

export type WordClickMemory = ReturnType<typeof createWordClickMemory>;
