import type { ReaderLocation } from "@easyimmerse/state";
import type { Document, TextSpan } from "@easyimmerse/types";

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
 * The span cut to the paragraph it addresses, or null when the document has no such chapter or paragraph.
 * Its start and end are clamped to the paragraph's length, so a span past the end of the text becomes empty.
 * Saved alignments go stale when the parser splits a document differently, and this keeps them usable.
 */
export function clampSpanToDocument(
  span: TextSpan,
  document: Document,
): TextSpan | null {
  const paragraph = paragraphOf(document, span);
  if (paragraph === undefined) return null;
  return {
    ...span,
    start: Math.min(span.start, paragraph.length),
    end: Math.min(span.end, paragraph.length),
  };
}

/** The text a span covers, or an empty string when it lies outside the document. */
export function textOfSpan(document: Document, span: TextSpan): string {
  const paragraph = paragraphOf(document, span);
  return paragraph === undefined ? "" : paragraph.slice(span.start, span.end);
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
