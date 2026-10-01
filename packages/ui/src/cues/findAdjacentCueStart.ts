import type { Cue } from "@easyimmerse/types";

/**
 * How long a cue may have been playing before going to the previous cue replays it
 * instead of going to the cue before it.
 */
const replayGraceMs = 500;

/**
 * Returns the start of the cue to skip to from the time, or null when there is none in that direction.
 * Going back from well inside a cue returns that cue's own start, so that a line can be heard again.
 * Expects the cues in order of their start times.
 */
export function findAdjacentCueStart(
  cues: readonly Cue[],
  timeMs: number,
  direction: "previous" | "next",
): number | null {
  if (direction === "next")
    return cues.find((cue) => cue.start_ms > timeMs)?.start_ms ?? null;
  return (
    cues.findLast((cue) => cue.start_ms < timeMs - replayGraceMs)?.start_ms ??
    null
  );
}
