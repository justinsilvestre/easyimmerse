import {
  type RootState,
  selectCuePanelSpan,
  selectCurrentTime,
  selectShownCue,
} from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { shallowEqual } from "react-redux";
import { createSelector } from "reselect";
import { cuesToPrefetch } from "./cuesToPrefetch.ts";

/**
 * Selects the cues whose words to look up ahead of the user, as `cuesToPrefetch` picks them,
 * as one list for as long as it holds the same cues, however often the player's time moves.
 */
export const selectCuesToPrefetch = createSelector(
  [
    (_state: RootState, cues: readonly Cue[]) => cues,
    (state: RootState, cues: readonly Cue[]) => selectShownCue(state, cues),
    selectCurrentTime,
    selectCuePanelSpan,
  ],
  (cues, shownCue, currentSeconds, panelSpan): readonly Cue[] =>
    cuesToPrefetch(cues, {
      shownCue,
      currentMs: currentSeconds * 1000,
      panelSpan,
    }),
  { memoizeOptions: { resultEqualityCheck: shallowEqual } },
);
