import type { Cue } from "@easyimmerse/types";

/** Finds the cue shown at a time, or null between cues. */
export function findCueAt(cues: readonly Cue[], ms: number): Cue | null {
  return cues.find((cue) => cue.start_ms <= ms && ms < cue.end_ms) ?? null;
}

/** Finds the translation cue spoken at the middle of a cue, which matches cues whose timings differ slightly. */
export function findTranslationOf(
  cue: Cue,
  translationCues: readonly Cue[],
): Cue | null {
  return findCueAt(translationCues, (cue.start_ms + cue.end_ms) / 2);
}
