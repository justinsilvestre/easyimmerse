import type { Cue } from "@easyimmerse/types";
import type { RootState } from "../../app/createAppStore.ts";
import { selectPlayer } from "../screenSelectors.ts";
import { findCueAt, findCueShownAt } from "./findCue.ts";

/**
 * Returns the cue to show over the video at the player's time, given cues in order of their start.
 * A cue shows while it is spoken. After its end it stays shown until the next cue starts,
 * as long as playback carried on through its end: a seek into the gap between cues shows none.
 */
export const selectShownCue = (
  state: RootState,
  cues: readonly Cue[],
): Cue | null => {
  const { currentTimeSeconds, lastSeekSeconds } = selectPlayer(state);
  return shownCueAt(
    cues,
    currentTimeSeconds * 1000,
    lastSeekSeconds === null ? null : lastSeekSeconds * 1000,
  );
};

/** Finds the cue shown at `ms`, given where the last seek went, or null when the player has not sought. */
export function shownCueAt(
  cues: readonly Cue[],
  ms: number,
  lastSeekMs: number | null,
): Cue | null {
  const latest = findCueShownAt(cues, ms);
  if (latest === null || ms < latest.end_ms) return latest;
  if (lastSeekMs === null || lastSeekMs < latest.end_ms) return latest;
  // A cue that started earlier may still be spoken, when cues overlap.
  return findCueAt(cues, ms);
}
