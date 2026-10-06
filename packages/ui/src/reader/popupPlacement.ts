type Rect = { top: number; bottom: number; left: number; width: number };
type Size = { width: number; height: number };

/** The space kept between the pop-up and the word, and between the pop-up and the window's edges. */
const margin = 8;

/**
 * Places a pop-up of the given width next to a word:
 * below it when the word is in the upper part of the window, above it otherwise,
 * and centered on it as far as the window allows.
 * Returns CSS offsets for a fixed-position band that runs from the word to the far edge of the window,
 * so that the pop-up inside it has a definite height to stop at and scroll within.
 */
export function popupPlacement(
  word: Rect,
  popupWidth: number,
  viewport: Size,
): { side: "above" | "below"; left: number; top: number; bottom: number } {
  const width = Math.min(popupWidth, viewport.width - 2 * margin);
  const centered = word.left + word.width / 2 - width / 2;
  const left = Math.min(
    Math.max(margin, centered),
    viewport.width - width - margin,
  );
  if (word.bottom < viewport.height * 0.55)
    return { side: "below", left, top: word.bottom + margin, bottom: margin };
  return {
    side: "above",
    left,
    top: margin,
    bottom: viewport.height - word.top + margin,
  };
}
