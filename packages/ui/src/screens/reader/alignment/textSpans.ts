import type { ReaderLocation } from "@easyimmerse/state";
import type { Document, TextSpan } from "@easyimmerse/types";
import { zeroWidthSpace } from "../unwrapHardLineBreaks.ts";

/** A paragraph of a document, addressed by position as the reader addresses it. */
export type ParagraphAddress = { chapterIndex: number; paragraphIndex: number };

/** Orders spans as their text comes in the document: by chapter, paragraph, start, then end. */
export function compareSpans(a: TextSpan, b: TextSpan): number {
  return (
    a.chapter_index - b.chapter_index ||
    a.paragraph_index - b.paragraph_index ||
    a.start - b.start ||
    a.end - b.end
  );
}

/** Whether the character at the location lies inside the span, whose end is exclusive. */
export function spanContains(
  span: TextSpan,
  location: ReaderLocation,
): boolean {
  return (
    isInParagraph(span, location.chapterIndex, location.paragraphIndex) &&
    span.start <= location.offset &&
    location.offset < span.end
  );
}

/** Whether the character at the location lies inside the span as `clampSpanToDocument` fits it to the document, which a stale span never does. */
export function fittedSpanContains(
  span: TextSpan,
  document: Document,
  location: ReaderLocation,
): boolean {
  const fitted = clampSpanToDocument(span, document);
  return fitted !== null && spanContains(fitted, location);
}

/** Whether the span lies in the given paragraph. */
export function isInParagraph(
  span: TextSpan,
  chapterIndex: number,
  paragraphIndex: number,
): boolean {
  return (
    span.chapter_index === chapterIndex &&
    span.paragraph_index === paragraphIndex
  );
}

/** The spans that lie in the given paragraph, in document order. */
export function spansOfParagraph(
  spans: readonly TextSpan[],
  chapterIndex: number,
  paragraphIndex: number,
): TextSpan[] {
  return spans
    .filter((span) => isInParagraph(span, chapterIndex, paragraphIndex))
    .sort(compareSpans);
}

/**
 * The span cut to the paragraph it addresses, or null when the document has no such chapter or paragraph,
 * or when the span has a quote and the text at its clamped position does not match it.
 * Its start and end are clamped to the paragraph's length, so a span past the end of the text becomes empty.
 * Saved alignments go stale when the parser splits a document differently: this keeps them usable,
 * and ignores a span whose quote shows that it now points at other text.
 */
export function clampSpanToDocument(
  span: TextSpan,
  document: Document,
): TextSpan | null {
  const paragraph = paragraphOf(document, span);
  if (paragraph === undefined) return null;
  const start = Math.min(span.start, paragraph.length);
  const end = Math.min(span.end, paragraph.length);
  if (
    typeof span.quote === "string" &&
    !quoteMatches(span.quote, paragraph.slice(start, end))
  )
    return null;
  return { ...span, start, end };
}

/**
 * Whether a span's quote, taken from the parser's text, matches the text the reader shows at the span's position.
 * The reader shows plain text with its hard line breaks unwrapped, so a line break in the quote also matches
 * the space or zero-width space that took its place.
 */
function quoteMatches(quote: string, shown: string): boolean {
  if (quote.length !== shown.length) return false;
  for (let index = 0; index < quote.length; index++) {
    const character = shown[index];
    const isUnwrappedBreak =
      quote[index] === "\n" &&
      (character === " " || character === zeroWidthSpace);
    if (quote[index] !== character && !isUnwrappedBreak) return false;
  }
  return true;
}

/** The text a span covers, or an empty string when it lies outside the document or its quote does not match. */
export function textOfSpan(document: Document, span: TextSpan): string {
  const clamped = clampSpanToDocument(span, document);
  return clamped === null
    ? ""
    : (paragraphOf(document, clamped) ?? "").slice(clamped.start, clamped.end);
}

/** The text the spans cover, joined with single spaces, leaving out spans that cover no text of the document. */
export function textOfSpans(
  document: Document,
  spans: readonly TextSpan[],
): string {
  return spans
    .map((span) => textOfSpan(document, span))
    .filter((text) => text !== "")
    .join(" ");
}

function paragraphOf(document: Document, span: TextSpan): string | undefined {
  return document.chapters[span.chapter_index]?.paragraphs[
    span.paragraph_index
  ];
}
