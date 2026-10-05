import type { WordHit } from "./useWordGestures.ts";

/** The first click of what may become a double-click: the word it landed on, and what a double-click on that word does. */
type FirstClick = {
  hit: WordHit;
  onDoubleClick: ((hit: WordHit) => void) | undefined;
  /** Drops the first click's own report, when it waits for the double-click interval. */
  cancel: () => void;
};

// The browser counts clicks for the pointer, not for a word, so the first click is kept for the whole page:
// a second click may land on another word, or another text, when the first one changed what lies under the pointer.
let firstClick: FirstClick | null = null;

/** Keeps a single click until the next click, which may make it a double-click. */
export function rememberFirstClick(click: FirstClick): void {
  firstClick = click;
}

/** Returns the remembered first click, once. */
export function takeFirstClick(): FirstClick | null {
  const click = firstClick;
  firstClick = null;
  return click;
}
