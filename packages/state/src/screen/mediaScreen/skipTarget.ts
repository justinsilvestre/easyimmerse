import type { Cue } from "@easyimmerse/types";
import { findCueShownAt } from "./findCue.ts";

/** How far a skip goes when there are no cues to skip to. */
const skipStepMs = 5_000;

/**
 * Where a skip lands: the start of the next cue,
 * or of the previous one (the current cue's own start once more than a second into it),
 * else a few seconds either way, within the file.
 */
export function skipTarget(
  cues: readonly Cue[],
  currentMs: number,
  durationMs: number,
  direction: "back" | "forward",
): number {
  const target =
    direction === "forward"
      ? (cues.find((cue) => cue.start_ms > currentMs + 1)?.start_ms ??
        currentMs + skipStepMs)
      : (cues.filter((cue) => cue.start_ms < currentMs - 1000).at(-1)
          ?.start_ms ?? currentMs - skipStepMs);
  return Math.min(Math.max(target, 0), durationMs);
}

/** Where a replay lands: the start of the cue shown now, else, before the first cue, a few seconds back, within the file. */
export function replayTarget(cues: readonly Cue[], currentMs: number): number {
  const target =
    findCueShownAt(cues, currentMs)?.start_ms ?? currentMs - skipStepMs;
  return Math.max(target, 0);
}
