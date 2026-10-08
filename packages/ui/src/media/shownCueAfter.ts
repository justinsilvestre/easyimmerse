import type { Cue } from "@easyimmerse/types";
import { findCueAt, findCueShownAt } from "./findCue.ts";

/**
 * The furthest the time moves between two observations while playback carries on, at up to twice the normal speed.
 * A larger move, or any move back, is a seek.
 */
const playbackStepMs = 2_000;

/**
 * Finds the cue to show at `ms`, given the cue shown at `lastMs`, the time observed before, given cues in order of their start.
 * A cue shows while it is spoken. After its end it stays shown until the next cue starts,
 * but only while playback carries on from it: a seek into the gap between cues shows none.
 */
export function shownCueAfter(
  previous: Cue | null,
  cues: readonly Cue[],
  lastMs: number | null,
  ms: number,
): Cue | null {
  const latest = findCueShownAt(cues, ms);
  if (latest === null || ms < latest.end_ms) return latest;
  const step = lastMs === null ? Number.NaN : ms - lastMs;
  const playsOn = step >= 0 && step < playbackStepMs;
  if (playsOn && previous !== null && isSameCue(previous, latest))
    return latest;
  // A cue that started earlier may still be spoken, when cues overlap.
  return findCueAt(cues, ms);
}

function isSameCue(first: Cue, second: Cue): boolean {
  return first.index === second.index && first.start_ms === second.start_ms;
}
