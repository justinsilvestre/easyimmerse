import type { TextSpan } from "@easyimmerse/types";
import { paragraphAttribute, rangeOfSpan } from "./textOffsets.ts";
import { readerViewportAttribute } from "./useParagraphsNearView.ts";

/** The name of the highlight on the text being spoken, which `styles.css` draws apart from the looked-up word's. */
export const spokenHighlightName = "reader-spoken";

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

/** Highlights the range as the text being spoken, in place of any range highlighted before. Does nothing where the browser lacks the CSS Custom Highlight API. */
export function highlightSpoken(range: Range) {
  if (typeof CSS === "undefined" || !CSS.highlights) return;
  const highlight = new Highlight(range);
  // Below the looked-up word's highlight, which may lie inside the sentence.
  highlight.priority = -1;
  CSS.highlights.set(spokenHighlightName, highlight);
}

/** Removes the highlight from the text last spoken. */
export function clearSpokenHighlight() {
  if (typeof CSS !== "undefined" && CSS.highlights)
    CSS.highlights.delete(spokenHighlightName);
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
