import { createSelector } from "reselect";
import type { AppRoot } from "../app/createAppStore.ts";
import { haveSameItems } from "../app/haveSameItems.ts";
import {
  type FailedSave,
  failedSaveIdOf,
  selectFailedSaves,
} from "./failedSave.ts";
import { flashcardNoticeKeys } from "./flashcardNotices.ts";
import { selectFlashcardRequests } from "./flashcardRequests.ts";

/** A failed save as the status line lists it. */
export type StatusLineSave = FailedSave & {
  flashcardId: string;
  /** Whether a Retry the user asked for is under way. */
  isRetrying: boolean;
};

/**
 * Returns the failed saves the status line lists: all but those whose refused save's own notice is showing.
 * The result keeps its reference while the saves it lists stay the same, as when a notice of something else shows or closes.
 */
export const selectStatusLineSaves = createSelector(
  [
    (state: AppRoot) => selectMarkedFailedSaves(state),
    (state: AppRoot) => state.app.notices.shown,
  ],
  (saves, notices): readonly StatusLineSave[] => {
    const shownKeys = new Set(notices.map(({ key }) => key));
    return saves.filter(
      ({ flashcardId }) =>
        !shownKeys.has(flashcardNoticeKeys.saveRefused(flashcardId)),
    );
  },
  { memoizeOptions: { resultEqualityCheck: haveSameItems } },
);

/** Returns every failed save, marked with whether its Retry is under way. */
const selectMarkedFailedSaves = createSelector(
  [(state: AppRoot) => selectFailedSaves(state.app), selectFlashcardRequests],
  (failedSaves, requests): readonly StatusLineSave[] =>
    failedSaves.map((failedSave) => {
      const flashcardId = failedSaveIdOf(failedSave);
      const isRetrying = requests.some(
        ({ request }) =>
          request.kind === "saveFlashcard" &&
          request.flashcardId === flashcardId &&
          request.purpose.type === "save" &&
          request.purpose.from === "retry",
      );
      return { ...failedSave, flashcardId, isRetrying };
    }),
);
