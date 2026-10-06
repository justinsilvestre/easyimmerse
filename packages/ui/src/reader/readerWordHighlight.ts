import { paragraphAttribute, rangeOfSpan } from "./textOffsets.ts";
import { zeroWidthSpace } from "./unwrapHardLineBreaks.ts";

const highlightName = "reader-word";

/** Highlights `length` characters of a paragraph from `start`, as the word the dictionary pop-up shows, in place of any word highlighted before. */
export function highlightWord(
  location: { chapterIndex: number; paragraphIndex: number; offset: number },
  length: number,
) {
  if (typeof CSS === "undefined" || !CSS.highlights) return;
  const paragraph = document.querySelector(
    `[data-chapter="${location.chapterIndex}"] [${paragraphAttribute}="${location.paragraphIndex}"]`,
  );
  const end =
    paragraph &&
    matchedSpanEnd(paragraph.textContent ?? "", location.offset, length);
  const range = paragraph && rangeOfSpan(paragraph, location.offset, end ?? 0);
  if (range) CSS.highlights.set(highlightName, new Highlight(range));
  else clearWordHighlight();
}

/** Removes the highlight from the word last looked up. */
export function clearWordHighlight() {
  if (typeof CSS !== "undefined" && CSS.highlights)
    CSS.highlights.delete(highlightName);
}

/**
 * Where a span of `length` characters of looked-up text that begins at `start` ends in the paragraph.
 * The lookup leaves out the zero-width spaces that join wrapped lines, so the span passes over them.
 */
export function matchedSpanEnd(
  paragraph: string,
  start: number,
  length: number,
): number {
  let end = start;
  for (let counted = 0; counted < length && end < paragraph.length; end++)
    if (paragraph[end] !== zeroWidthSpace) counted++;
  return end;
}
