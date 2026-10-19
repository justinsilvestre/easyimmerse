import type { TextSpan } from "@easyimmerse/types";
import { paragraphAttribute, rangeOfSpan } from "./textOffsets.ts";
import { readerViewportAttribute } from "./useParagraphsNearView.ts";

/** The name of the highlight on the text being spoken, which `styles.css` draws apart from the looked-up word's. */
export const spokenHighlightName = "reader-spoken";

/** The name of the highlight on the sentence whose translation the dictionary pop-up's sentence row shows. */
export const translatedHighlightName = "reader-translated";

/**
 * The range of the text a span covers among the paragraphs shown inside `container`,
 * or null when its paragraph is not shown, as in another chapter or section.
 */
export function rangeOfShownSpan(
  container: Element,
  span: TextSpan,
): Range | null {
  const paragraph = container.querySelector(
    `[data-chapter="${span.chapter_index}"] [${paragraphAttribute}="${span.paragraph_index}"]`,
  );
  return paragraph && rangeOfSpan(paragraph, span.start, span.end);
}

/**
 * Highlights the ranges under the name, in place of any highlighted under it before, below the looked-up word's highlight,
 * which may lie inside them. Does nothing where the browser lacks the CSS Custom Highlight API.
 */
export function highlightRanges(name: string, ranges: readonly Range[]) {
  if (typeof CSS === "undefined" || !CSS.highlights) return;
  const highlight = new Highlight(...ranges);
  highlight.priority = -1;
  CSS.highlights.set(name, highlight);
}

/** Removes the highlight of the name. */
export function clearHighlight(name: string) {
  if (typeof CSS !== "undefined" && CSS.highlights) CSS.highlights.delete(name);
}

/**
 * Whether any of the range's text lies in the page or the stretch of the column in view inside `container`.
 * Where the browser cannot measure the range, it counts as in view, so that the text never moves on a guess.
 */
export function isRangeInView(container: Element, range: Range): boolean {
  const viewport = container.querySelector(`[${readerViewportAttribute}]`);
  if (viewport === null || typeof range.getClientRects !== "function")
    return true;
  const view = viewport.getBoundingClientRect();
  const rects = Array.from(range.getClientRects());
  if (rects.length === 0) return true;
  return rects.some(
    (rect) =>
      rect.right > view.left &&
      rect.left < view.right &&
      rect.bottom > view.top &&
      rect.top < view.bottom,
  );
}
