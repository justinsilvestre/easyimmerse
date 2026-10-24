import type { ReaderLocation } from "@easyimmerse/state";
import type { Document, TimedSpan } from "@easyimmerse/types";
import {
  compareSpans,
  fittedSpanContains,
  isInParagraph,
} from "./textSpans.ts";

/**
 * The segment whose text in the document holds the location, or null when no segment covers it.
 * A segment whose quote no longer matches the document's text covers nothing.
 */
export function segmentAt(
  segments: readonly TimedSpan[],
  document: Document,
  location: ReaderLocation,
): TimedSpan | null {
  return (
    segments.find(({ span }) => fittedSpanContains(span, document, location)) ??
    null
  );
}

/** The segments whose text lies in the given paragraph, in document order. */
export function segmentsOfParagraph(
  segments: readonly TimedSpan[],
  chapterIndex: number,
  paragraphIndex: number,
): TimedSpan[] {
  return segments
    .filter(({ span }) => isInParagraph(span, chapterIndex, paragraphIndex))
    .sort((a, b) => compareSpans(a.span, b.span));
}
