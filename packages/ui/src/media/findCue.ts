import { findCueAt } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import type { LineStep } from "../components/cursorKeys.ts";

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
