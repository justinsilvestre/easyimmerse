import type { AppState } from "../app/appState.ts";
import type { RootState } from "../app/createAppStore.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import { isFlashcardScope } from "./flashcardRequests.ts";
import { formOf, pendingFlashcardOf } from "./flashcardsOnScreen.ts";

/**
 * Counts the pieces of flashcard work that closing the app would lose: the open form while it is changed,
 * asked to save, sending or failed; each flashcard request pending; each card waiting for its lookup; each failed save;
 * and a flashcard from a word waiting for its lookup. Only whether the count is zero matters.
 */
export function unsavedWorkCount(app: AppState): number {
  const requests = app.operations.requests.filter(({ scope }) =>
    isFlashcardScope(scope),
  ).length;
  const { waitingForLookup, failedSaves } = app.flashcards;
  return (
    (isFormAtRisk(formOf(app)) ? 1 : 0) +
    requests +
    waitingForLookup.length +
    failedSaves.length +
    (pendingFlashcardOf(app) === null ? 0 : 1)
  );
}

/** Returns how many pieces of work closing the app would lose, as `unsavedWorkCount` counts them. */
export const selectUnsavedWorkCount = (state: RootState) =>
  unsavedWorkCount(state.app);

function isFormAtRisk(form: FlashcardForm | null): boolean {
  return (
    form !== null &&
    (form.card.isChanged ||
      form.stage === "awaitingLookupToSave" ||
      form.stage === "sending" ||
      form.saveFailure !== null)
  );
}
