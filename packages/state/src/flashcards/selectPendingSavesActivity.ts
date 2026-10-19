import { createSelector } from "reselect";
import type { FooterActivity } from "../footer/footerActivity.ts";
import { selectFlashcardRequests } from "./flashcardRequests.ts";

/**
 * Selects the flashcard saves as the footer shows them once one has waited on the server for a while, as when it is slow or unreachable:
 * how many flashcards are being saved, with no place to show them.
 */
export const selectPendingSavesActivity = createSelector(
  [selectFlashcardRequests],
  (requests): FooterActivity | null => {
    const saves = requests.filter(
      ({ request }) => request.kind === "saveFlashcard",
    );
    if (!saves.some(({ isSlow }) => isSlow === true)) return null;
    const count = new Set(
      saves.map(({ request }) =>
        request.kind === "saveFlashcard" ? request.flashcardId : null,
      ),
    ).size;
    return {
      id: "flashcard-saves",
      label: `Saving ${count} ${count === 1 ? "flashcard" : "flashcards"}…`,
      opens: null,
      status: "running",
      percent: null,
    };
  },
);
