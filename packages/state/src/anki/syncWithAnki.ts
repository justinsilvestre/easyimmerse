import type { ReadableState } from "../app/feature.ts";
import { cachedFlashcards, hasNoPendingDeletion } from "./ankiCache.ts";
import { isWaitingToBeSent, oldestFirst } from "./ankiExportSelection.ts";
import {
  deleteFromAnki,
  flashcardIdsBeingSent,
  isDeletionWaiting,
  sendToAnki,
} from "./ankiRequests.ts";

type AnkiSyncApp = Pick<ReadableState, "backend" | "operations">;

/**
 * Sends the flashcards new or changed since AnkiConnect last put them into Anki, and then deletes the notes of deleted flashcards.
 * Nothing is deleted when the cache lists no pending deletion, or while a deletion waits,
 * since that deletion will list every pending one when it starts.
 */
export function syncWithAnki(projectId: string, app: AnkiSyncApp) {
  return [...sendUnsent(projectId, app), ...deletePending(projectId, app)];
}

/**
 * Sends the flashcards new or changed since AnkiConnect last put them into Anki, oldest first.
 * A flashcard that a send under way or waiting already holds, including one whose send is settling, is left to that send.
 */
export function sendUnsent(
  projectId: string,
  { backend, operations }: AnkiSyncApp,
) {
  const beingSent = flashcardIdsBeingSent(operations.requests, projectId);
  const unsent = cachedFlashcards(backend, projectId).filter(
    (flashcard) => isWaitingToBeSent(flashcard) && !beingSent.has(flashcard.id),
  );
  if (unsent.length === 0) return [];
  return [
    sendToAnki(
      projectId,
      oldestFirst(unsent).map(({ id }) => id),
    ),
  ];
}

function deletePending(
  projectId: string,
  { backend, operations }: AnkiSyncApp,
) {
  return hasNoPendingDeletion(backend, projectId) ||
    isDeletionWaiting(operations.requests, projectId)
    ? []
    : [deleteFromAnki(projectId, null)];
}
