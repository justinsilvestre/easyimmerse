import type { Cue } from "@easyimmerse/types";

/** Finds the cue spoken at a time, or null between cues. */
export function findCueAt(cues: readonly Cue[], ms: number): Cue | null {
  return cues.find((cue) => cue.start_ms <= ms && ms < cue.end_ms) ?? null;
}

/**
 * Finds the cue shown at a time: the last one to start at or before it, given cues in order of their start.
 * A cue stays shown until the next one starts, so that its words can still be looked up once it has been spoken.
 */
export function findCueShownAt(cues: readonly Cue[], ms: number): Cue | null {
  return cues.findLast((cue) => cue.start_ms <= ms) ?? null;
}
