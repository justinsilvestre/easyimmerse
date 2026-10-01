import type { Cue } from "@easyimmerse/types";

/**
 * Returns the cue showing at the time, or the most recent cue when the time falls between cues,
 * so that a cue stays visible until the next one starts. Returns null before the first cue.
 * Expects the cues in order of their start times.
 */
export function findCueAt(cues: readonly Cue[], timeMs: number): Cue | null {
  let found: Cue | null = null;
  for (const cue of cues) {
    if (cue.start_ms > timeMs) break;
    found = cue;
  }
  return found;
}
