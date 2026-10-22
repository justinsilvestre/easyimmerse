import { cachedFlashcards } from "../anki/ankiCache.ts";
import type { RootState } from "../app/createAppStore.ts";

/** Tells whether the user suspended a flashcard from the review, as the cached list of the project's flashcards says. */
export function selectIsFlashcardSuspended(
  root: Pick<RootState, "backend">,
  projectId: string,
  flashcardId: string,
): boolean {
  return cachedFlashcards(root.backend, projectId).some(
    ({ id, is_suspended }) => id === flashcardId && is_suspended,
  );
}
