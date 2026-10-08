import type { Cue } from "@easyimmerse/types";
import type { LineStep } from "../components/cursorKeys.ts";

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

/** Finds the cue before or after a cue in the list, or null at either end. */
export function findAdjacentCue(
  cues: readonly Cue[],
  cue: Cue,
  step: LineStep,
): Cue | null {
  const index = cues.findIndex((each) => each.index === cue.index);
  if (index === -1) return null;
  return cues[step === "next" ? index + 1 : index - 1] ?? null;
}

/** Finds the translation cue spoken at the middle of a cue, which matches cues whose timings differ slightly. */
export function findTranslationOf(
  cue: Cue,
  translationCues: readonly Cue[],
): Cue | null {
  return findCueAt(translationCues, (cue.start_ms + cue.end_ms) / 2);
}
