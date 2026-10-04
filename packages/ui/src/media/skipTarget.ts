import type { Cue } from "@easyimmerse/types";

/** How far a skip goes when there are no cues to skip to. */
export const skipStepMs = 5_000;

/**
 * Where a skip lands: the start of the next cue, or of the previous one (the current cue's own start
 * once more than a second into it), else a few seconds either way, within the file.
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
