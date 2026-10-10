import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { type FailedSave, failedSaveIdOf } from "./failedSave.ts";
import { flashcardNoticeKeys } from "./flashcardNotices.ts";
import { selectFlashcardRequests } from "./selectFlashcardRequests.ts";

/** A failed save as the status line lists it. */
export type StatusLineSave = FailedSave & {
  flashcardId: string;
  /** Whether a Retry the user asked for is under way. */
  isRetrying: boolean;
};

/** Returns the failed saves the status line lists: all but those whose refused save's own notice is showing. */
export const selectStatusLineSaves = createSelector(
  [
    (state: RootState) => state.app.flashcards.failedSaves,
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
