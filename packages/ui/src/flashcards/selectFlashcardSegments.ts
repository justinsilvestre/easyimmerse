import { type RootState, selectMediaFlashcards } from "@easyimmerse/state";
import type { Flashcard } from "@easyimmerse/types";
import { shallowEqual } from "react-redux";
import { createSelector } from "reselect";
import type { FlashcardSegment } from "../components/waveform/flashcardSegment.ts";
import { flashcardSegmentsOf } from "./flashcardSegmentsOf.ts";

/**
 * Selects the waveform segments of a media file's flashcards, from the cached list `listed`, as `selectMediaFlashcards` draws them,
 * as one list for as long as no segment moves, so that typing in the open card leaves it as it was.
 */
export const selectFlashcardSegments = createSelector(
  [
    (
      state: RootState,
      listed: readonly Flashcard[] | undefined,
      mediaFileId: string,
    ) => selectMediaFlashcards(state, listed, mediaFileId).drawn,
  ],
  flashcardSegmentsOf,
  { memoizeOptions: { resultEqualityCheck: haveSameSegments } },
);

function haveSameSegments(
  first: readonly FlashcardSegment[],
  second: readonly FlashcardSegment[],
): boolean {
  return (
    first.length === second.length &&
    first.every((segment, index) => shallowEqual(segment, second[index]))
  );
}
