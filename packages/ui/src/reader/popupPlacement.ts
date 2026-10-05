type Rect = { top: number; bottom: number; left: number; width: number };
type Size = { width: number; height: number };

/** The space kept between the pop-up and the word, and between the pop-up and the window's edges. */
const margin = 8;

/**
 * Places a pop-up of the given width next to a word:
 * below it when the word is in the upper part of the window, above it otherwise,
 * and centered on it as far as the window allows.
 * Returns CSS offsets for a fixed-position element.
 */
export function popupPlacement(
  word: Rect,
  popupWidth: number,
  viewport: Size,
): { left: number; top?: number; bottom?: number; maxHeight: number } {
  const width = Math.min(popupWidth, viewport.width - 2 * margin);
  const centered = word.left + word.width / 2 - width / 2;
  const left = Math.min(
    Math.max(margin, centered),
    viewport.width - width - margin,
  );
  if (word.bottom < viewport.height * 0.55)
    return {
      left,
      top: word.bottom + margin,
      maxHeight: viewport.height - word.bottom - 2 * margin,
    };
  return {
    left,
    bottom: viewport.height - word.top + margin,
    maxHeight: word.top - 2 * margin,
  };
}
