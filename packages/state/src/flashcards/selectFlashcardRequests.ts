import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { isFlashcardScope } from "./flashcardRequests.ts";

/** Returns the pending flashcard requests, as the same array while they stay the same, so that other requests do not draw the flashcards again. */
export const selectFlashcardRequests = createSelector(
  [(state: RootState) => state.app.operations.requests],
  (requests) => requests.filter(({ scope }) => isFlashcardScope(scope)),
  { memoizeOptions: { resultEqualityCheck: isSameList } },
);

function isSameList<T>(first: readonly T[], second: readonly T[]): boolean {
  return (
    first.length === second.length &&
    first.every((item, index) => item === second[index])
  );
}
