import type { ReaderLocation } from "@easyimmerse/state";
import type { TimedSpan } from "@easyimmerse/types";
import { compareSpans, isInParagraph, spanContains } from "./textSpans.ts";

/** The segment whose text holds the location, or null when no segment covers it. */
export function segmentAt(
  segments: readonly TimedSpan[],
  location: ReaderLocation,
): TimedSpan | null {
  return segments.find(({ span }) => spanContains(span, location)) ?? null;
}

/**
 * The first segment heard at the time, from its start up to but not including its end,
 * or null when none is. Segments need not be sorted by time.
 */
export function segmentSpokenAt(
  segments: readonly TimedSpan[],
  timeMs: number,
): TimedSpan | null {
  return (
    segments.find(
      (segment) => segment.start_ms <= timeMs && timeMs < segment.end_ms,
    ) ?? null
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
