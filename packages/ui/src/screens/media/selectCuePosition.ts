import type { RootState } from "@easyimmerse/state";
import { selectLookupCursor } from "@easyimmerse/state";
import { shallowEqual } from "react-redux";
import { createSelector } from "reselect";
import { cuePositionOf } from "../../components/cuePanel/cueCursor.ts";
import { selectCursorMatchedLength } from "../../components/wordLookup/selectCursorMatchedLength.ts";

/**
 * Returns the lookup cursor's place in the subtitles, highlighted at once when its word's lookup is cached,
 * as one object while its place and length stay the same.
 */
export const selectCuePosition = createSelector(
  [
    (state: RootState) => selectLookupCursor(state.app),
    selectCursorMatchedLength,
  ],
  cuePositionOf,
  { memoizeOptions: { resultEqualityCheck: shallowEqual } },
);
