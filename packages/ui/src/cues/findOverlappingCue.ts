import type { Cue, TimeRange } from "@easyimmerse/types";

/** Returns the cue sharing the most time with the range, or null when none shares any. */
export function findOverlappingCue(
  cues: readonly Cue[],
  range: TimeRange,
): Cue | null {
  let found: Cue | null = null;
  let longestOverlapMs = 0;
  for (const cue of cues) {
    const overlapMs =
      Math.min(cue.end_ms, range.end_ms) -
      Math.max(cue.start_ms, range.start_ms);
    if (overlapMs > longestOverlapMs) {
      found = cue;
      longestOverlapMs = overlapMs;
    }
  }
  return found;
}
