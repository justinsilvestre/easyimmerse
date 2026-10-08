import type { Cue } from "@easyimmerse/types";
import { useState } from "react";
import { shownCueAfter } from "./shownCueAfter.ts";

/**
 * The cue to show at the current time, as `shownCueAfter` finds it from the cue shown at the time observed before.
 * Cues come in order of their start.
 */
export function useShownCue(
  cues: readonly Cue[],
  currentMs: number,
): Cue | null {
  const [last, setLast] = useState<{ cue: Cue | null; ms: number | null }>({
    cue: null,
    ms: null,
  });
  const cue = shownCueAfter(last.cue, cues, last.ms, currentMs);
  if (last.ms !== currentMs || last.cue !== cue)
    setLast({ cue, ms: currentMs });
  return cue;
}
