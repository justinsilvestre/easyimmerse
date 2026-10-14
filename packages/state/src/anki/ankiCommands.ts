import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { isAborted } from "../server/isAborted.ts";
import type {
  RequestOutcome,
  RequestSettled,
} from "../server/serverRequest.ts";
import { cachedDestination, cachedFlashcards } from "./ankiCache.ts";
import {
  ankiUnreachableCode,
  deletedNotice,
  deleteFailedNotice,
  deletionPendingNotice,
  sendFailedNotice,
  sentNotice,
} from "./ankiNotices.ts";
import { deleteFromAnki, sendToAnki } from "./ankiRequests.ts";

type AnkiApp = Pick<ReadableState, "backend">;
type Settled<K> = Extract<RequestSettled, { request: { kind: K } }>;

/**
 * Returns the effects of AnkiConnect sends that belong to no screen, in a project whose flashcards go to Anki through AnkiConnect:
 * a saved flashcard is sent there once its save lands, and the notes of deleted flashcards are deleted there once a deletion lands.
 * Every send's outcome is told of, except that Anki could not be reached: the project screen's panel shows that,
 * and a notice would repeat it after every save while Anki is closed. A failed send leaves its flashcards unsent until the next save or Send.
 * A note that Anki could not be reached to delete is deleted the next time Anki is found running, and the notice says so.
 */
export function ankiCommands(action: AppAction, app: AnkiApp) {
  if (action.type !== "requestSettled") return [];
  return [
    ...sendSaved(action, app),
    ...deleteDeleted(action, app),
    ...sendNotices(action),
    ...deleteNotices(action),
  ];
}

function sendSaved({ request, outcome }: RequestSettled, { backend }: AnkiApp) {
  if (request.kind !== "saveFlashcard" || !outcome.ok) return [];
  const { projectId, flashcardId } = request;
  return cachedDestination(backend, projectId) === "anki_connect"
    ? [sendToAnki(projectId, [flashcardId])]
    : [];
}

/** Deletes the notes of the project's deleted flashcards, naming the one just deleted by its word as cached before the deletion, or as its Undo or rollback names it. */
function deleteDeleted(
  { request, outcome }: RequestSettled,
  { backend }: AnkiApp,
) {
  if (request.kind !== "deleteFlashcard" || !outcome.ok) return [];
  const { projectId, flashcardId, purpose } = request;
  if (cachedDestination(backend, projectId) !== "anki_connect") return [];
  const deleted = cachedFlashcards(backend, projectId).find(
    ({ id }) => id === flashcardId,
  );
  const word =
    deleted?.content.word ?? (purpose.type === "delete" ? "" : purpose.word);
  return [deleteFromAnki(projectId, word)];
}

function sendNotices(action: RequestSettled) {
  if (action.request.kind !== "sendFlashcardsToAnki") return [];
  const { outcome } = action as Settled<"sendFlashcardsToAnki">;
  if (outcome.ok) return [sentNotice(outcome.data)];
  return isSilentFailure(outcome) ? [] : [sendFailedNotice(outcome.error)];
}

/**
 * Tells of a deletion that a flashcard's deletion asked for only when it fails or Anki cannot be reached,
 * and of one that ran once Anki was found running only when it deleted notes or failed.
 */
function deleteNotices(action: RequestSettled) {
  if (action.request.kind !== "deleteAnkiNotes") return [];
  const { request, outcome } = action as Settled<"deleteAnkiNotes">;
  if (!outcome.ok)
    return isAborted(outcome)
      ? []
      : [deleteFailedNotice(request.word, outcome.error)];
  const { deletedCount, remainingCount } = outcome.data;
  if (request.word !== null)
    return remainingCount > 0 ? [deletionPendingNotice(request.word)] : [];
  return deletedCount > 0 ? [deletedNotice(deletedCount)] : [];
}

function isSilentFailure(outcome: RequestOutcome) {
  return (
    isAborted(outcome) ||
    (!outcome.ok && outcome.error.code === ankiUnreachableCode)
  );
}
