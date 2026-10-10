import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import {
  type FailedSave,
  failedSaveIdOf,
  failedSavesOf,
} from "./failedSave.ts";
import { flashcardNoticeKeys } from "./flashcardNotices.ts";
import { selectFlashcardRequests } from "./selectFlashcardRequests.ts";

/** A failed save as the status line lists it. */
export type StatusLineSave = FailedSave & {
  flashcardId: string;
  /** Whether a Retry the user asked for is under way. */
  isRetrying: boolean;
};

/**
 * Returns the failed saves, read from the requests kept for them,
 * as the same array while they stay the same, so that other requests do not draw the flashcards again.
 */
export const selectFailedSaves = createSelector(
  [(state: RootState) => state.app.operations],
  failedSavesOf,
  { memoizeOptions: { resultEqualityCheck: isSameFailedSaves } },
);

/** Returns the failed saves the status line lists: all but those whose refused save's own notice is showing. */
export const selectStatusLineSaves = createSelector(
  [
    selectFailedSaves,
    (state: RootState) => state.app.notices.shown,
    selectFlashcardRequests,
  ],
  (failedSaves, notices, requests): readonly StatusLineSave[] => {
    const shownKeys = new Set(notices.map(({ key }) => key));
    return failedSaves
      .map((failedSave) => {
        const flashcardId = failedSaveIdOf(failedSave);
        const isRetrying = requests.some(
          ({ request }) =>
            request.kind === "saveFlashcard" &&
            request.flashcardId === flashcardId &&
            request.purpose.type === "save" &&
            request.purpose.from === "retry",
        );
        return { ...failedSave, flashcardId, isRetrying };
      })
      .filter(
        ({ flashcardId }) =>
          !shownKeys.has(flashcardNoticeKeys.saveRefused(flashcardId)),
      );
  },
);

function isSameFailedSaves(
  first: readonly FailedSave[],
  second: readonly FailedSave[],
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (failedSave, index) =>
        failedSave.kept === second[index]?.kept &&
        failedSave.isOpening === second[index]?.isOpening,
    )
  );
}
