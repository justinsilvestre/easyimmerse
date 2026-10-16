import type { Flashcard, Project } from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { cacheEntry } from "../server/cacheEntry.ts";
import { cachedFlashcards, cachedIsAnkiConnected } from "./ankiCache.ts";

/** What deleting a flashcard does to its note in Anki, as the confirmation of the deletion tells it. */
export type AnkiFateOfDeletion = {
  /**
   * What becomes of its note in the user's Anki: there was none,
   * AnkiConnect deletes it now or, while the last check did not find Anki running, once easyImmerse next reaches Anki,
   * or it stays until the user deletes it there, listed on the project screen or not.
   */
  note:
    | "none"
    | "deletedByAnkiConnect"
    | "deletedByAnkiConnectLater"
    | "staysListed"
    | "stays";
  /** Whether any package ever held the flashcard, so that importing one would bring it back. */
  wasPackaged: boolean;
};

/**
 * Selects what deleting the flashcard does to its note in Anki, from the cached project and flashcard and the last check of the connection to Anki,
 * or null while the project or the flashcard is not cached. The result keeps its reference while those do.
 */
export const selectAnkiFateOfDeletion = createSelector(
  [
    (root: RootState, projectId: string) =>
      cacheEntry(root.backend, "getProject", projectId)?.data ?? null,
    (root: RootState, projectId: string, flashcardId: string) =>
      cachedFlashcards(root.backend, projectId).find(
        ({ id }) => id === flashcardId,
      ) ?? null,
    (root: RootState) => cachedIsAnkiConnected(root.backend),
  ],
  (project, flashcard, isAnkiConnected): AnkiFateOfDeletion | null =>
    project === null || flashcard === null
      ? null
      : {
          note: noteFate(project, flashcard, isAnkiConnected),
          wasPackaged: flashcard.was_packaged,
        },
);

function noteFate(
  project: Project,
  flashcard: Flashcard,
  isAnkiConnected: boolean,
): AnkiFateOfDeletion["note"] {
  if (flashcard.exported_at_ms === null && flashcard.sent_at_ms === null)
    return "none";
  if (project.uses_anki_connect)
    return isAnkiConnected
      ? "deletedByAnkiConnect"
      : "deletedByAnkiConnectLater";
  return project.settings.lists_anki_deletions ? "staysListed" : "stays";
}
