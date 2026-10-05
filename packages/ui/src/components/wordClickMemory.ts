import { doubleClickMs } from "./gestureTiming.ts";
import { createTimer } from "./timer.ts";
import type { WordHit } from "./useWordGestures.ts";

/** Where a click landed in the viewport. */
export type ClickPoint = { x: number; y: number };

/** The first click of what may become a double-click: the word it landed on, and what a double-click on that word does. */
type FirstClick = {
  hit: WordHit;
  point: ClickPoint;
  onDoubleClick: ((hit: WordHit) => void) | undefined;
  /** Drops the first click's own report, when it waits for the double-click interval. */
  cancel: () => void;
};

/** How far apart the two taps of a double tap may land. */
const doubleTapSlopPx = 24;

// The browser counts clicks for the pointer, not for a word, so the first click is kept for the whole page:
// a second click may land on another word, or another text, when the first one changed what lies under the pointer.
let firstClick: FirstClick | null = null;
const tapExpiry = createTimer();

/**
 * Keeps a single click until the next click, which may make it a double-click.
 * A mouse click is kept as long as that, since the browser counts mouse double-clicks itself;
 * browsers count taps unreliably, so a tap is kept only for the double-click interval.
 */
export function rememberFirstClick(click: FirstClick): void {
  firstClick = click;
  tapExpiry.cancel();
  if (click.hit.input === "touch")
    tapExpiry.restart(doubleClickMs, () => {
      if (firstClick === click) firstClick = null;
    });
}

/** Returns the remembered first click, once. */
export function takeFirstClick(): FirstClick | null {
  const click = firstClick;
  firstClick = null;
  tapExpiry.cancel();
  return click;
}

/**
 * Returns, once, the first tap that a tap at `point` makes a double tap:
 * a tap at about the same place within the interval, on a word still on the page.
 */
export function takeDoubleTap(point: ClickPoint): FirstClick | null {
  const click = firstClick;
  if (click?.hit.input !== "touch" || !click.hit.element.isConnected)
    return null;
  const distance = Math.hypot(point.x - click.point.x, point.y - click.point.y);
  return distance > doubleTapSlopPx ? null : takeFirstClick();
}
