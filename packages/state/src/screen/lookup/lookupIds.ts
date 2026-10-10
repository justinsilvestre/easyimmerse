import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";

/** The ids of the lookup's timers. Starting one again replaces it. */
export const lookupTimerIds = {
  close: "lookup/close",
  flashcardWait: "lookup/flashcardWait",
};

/** Cancels the lookup's timers as its screen closes. A flashcard's request in flight is left to settle, unheeded. */
export const leaveLookup: readonly Effect[] = Object.values(lookupTimerIds).map(
  (id) => ({ type: "cancelTimer", id }),
);

/** The id of the lookup request of the flashcard with this sequence. */
export function lookupRequestId(sequence: number): string {
  return `lookup/flashcard/${sequence}`;
}

/** The sequence of the next flashcard started from a word, counted over the whole session by the operations feature. */
export function nextFlashcardSequence(app: AppState): number {
  return app.operations.lookupFlashcardsStarted + 1;
}
