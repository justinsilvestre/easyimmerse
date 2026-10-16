import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { isAborted } from "../server/isAborted.ts";
import type {
  RequestOutcome,
  RequestSettled,
} from "../server/serverRequest.ts";
import { cachedFlashcards, cachedUsesAnkiConnect } from "./ankiCache.ts";
import {
  ankiUnreachableCode,
  deletedNoteNotice,
  deletedNotice,
  deleteFailedNotice,
  deletionPendingNotice,
  deletionUnrecordedNotice,
  sendFailedNotice,
  sentNotice,
} from "./ankiNotices.ts";
import {
  type DeletedFlashcard,
  deleteFromAnki,
  sendToAnki,
} from "./ankiRequests.ts";
import type { AnkiDeletionOutcome, AnkiSendOutcome } from "./ankiResponses.ts";
import { isNeverDelivered } from "./ankiUpdatesQueue.ts";
import { sendUnsent, syncWithAnki } from "./syncWithAnki.ts";

type AnkiApp = Pick<ReadableState, "backend" | "operations">;
type Settled<K> = Extract<RequestSettled, { request: { kind: K } }>;
type AnkiSettled = Settled<"sendFlashcardsToAnki" | "deleteAnkiNotes">;

/**
 * Returns the effects of AnkiConnect sends that belong to no screen, in a project that uses AnkiConnect:
 * a saved flashcard is sent there once its save lands, and the notes of deleted flashcards are deleted there once a deletion lands.
 * Every send's outcome is told of, except that Anki could not be reached: the project screen's panel shows that,
 * and a notice would repeat it after every save while Anki is closed. A failed send leaves its flashcards unsent until the next save or Send.
 * Every deletion that deletes notes is told of. A note that Anki could not be reached to delete is deleted the next time Anki is found running,
 * and the notice says so.
 * Once a send or a deletion finds Anki running although the app had not known it to be, the project is synced with Anki,
 * on whichever screen the user is.
 */
export function ankiCommands(action: AppAction, app: AnkiApp) {
  if (action.type !== "requestSettled") return [];
  return [
    ...sendSaved(action, app),
    ...deleteDeleted(action, app),
    ...syncOnceFound(action, app),
    ...sendNotices(action),
    ...deleteNotices(action),
  ];
}

function sendSaved({ request, outcome }: RequestSettled, { backend }: AnkiApp) {
  if (request.kind !== "saveFlashcard" || !outcome.ok) return [];
  const { projectId, flashcardId } = request;
  return cachedUsesAnkiConnect(backend, projectId)
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
  if (!cachedUsesAnkiConnect(backend, projectId)) return [];
  const deleted = cachedFlashcards(backend, projectId).find(
    ({ id }) => id === flashcardId,
  );
  const word =
    deleted?.content.word ?? (purpose.type === "delete" ? "" : purpose.word);
  const reachedAnki = deleted !== undefined && !isNeverDelivered(deleted);
  return [deleteFromAnki(projectId, { flashcardId, word, reachedAnki })];
}

/**
 * Syncs the project with Anki after a send or a deletion that found Anki running although the app had not known it to be.
 * A deletion that found Anki has carried out every pending deletion it could, so only the unsent flashcards follow it.
 * The settling send is still recorded, so the flashcards it held are not sent again.
 */
function syncOnceFound(action: RequestSettled, app: AnkiApp) {
  if (!hasFoundAnki(action)) return [];
  const { kind, projectId } = action.request;
  if (!cachedUsesAnkiConnect(app.backend, projectId)) return [];
  return kind === "sendFlashcardsToAnki"
    ? syncWithAnki(projectId, app)
    : sendUnsent(projectId, app);
}

function hasFoundAnki(action: RequestSettled): action is AnkiSettled {
  const { request, outcome } = action as AnkiSettled;
  return (
    (request.kind === "sendFlashcardsToAnki" ||
      request.kind === "deleteAnkiNotes") &&
    outcome.ok &&
    outcome.data.foundAnki
  );
}

/** Tells of every send's outcome, except a send with no flashcard left to send, such as one whose flashcards were all deleted. */
function sendNotices(action: RequestSettled) {
  if (action.request.kind !== "sendFlashcardsToAnki") return [];
  const { request, outcome } = action as Settled<"sendFlashcardsToAnki">;
  if (outcome.ok)
    return hasSentAny(outcome.data) ? [sentNotice(outcome.data)] : [];
  return isSilentFailure(outcome)
    ? []
    : [sendFailedNotice(request.flashcardIds.length, outcome.error)];
}

/**
 * Tells of a deletion's failure, of the notes it deleted, and of the deletions the server could not record.
 * The flashcard just deleted is named only where its note is known to have been deleted or to wait for Anki, since it may never have reached Anki.
 */
function deleteNotices(action: RequestSettled) {
  if (action.request.kind !== "deleteAnkiNotes") return [];
  const { request, outcome } = action as Settled<"deleteAnkiNotes">;
  if (!outcome.ok)
    return isAborted(outcome) ? [] : [deleteFailedNotice(outcome.error)];
  const { unrecordedCount } = outcome.data;
  return [
    ...deletionNotices(request.justDeleted, outcome.data),
    ...(unrecordedCount > 0 ? [deletionUnrecordedNotice(unrecordedCount)] : []),
  ];
}

/**
 * Names the flashcard just deleted when its note waits for Anki, or when it is the only note deleted, and otherwise counts the notes deleted.
 * A note waiting for Anki is told of only for the flashcard just deleted, since the project screen's panel counts the others.
 */
function deletionNotices(
  justDeleted: DeletedFlashcard | null,
  outcome: AnkiDeletionOutcome,
) {
  if (justDeleted !== null) {
    const { flashcardId, word, reachedAnki } = justDeleted;
    if (outcome.remainingFlashcardIds.includes(flashcardId))
      return [deletionPendingNotice(word, reachedAnki)];
    if (isOnlyNoteDeleted(flashcardId, outcome))
      return [deletedNoteNotice(word)];
  }
  return outcome.deletedCount > 0 ? [deletedNotice(outcome.deletedCount)] : [];
}

function isOnlyNoteDeleted(
  flashcardId: string,
  { deletedCount, deletedFlashcardIds }: AnkiDeletionOutcome,
) {
  return deletedCount === 1 && deletedFlashcardIds[0] === flashcardId;
}

function hasSentAny({ sentCount, failedCount }: AnkiSendOutcome) {
  return sentCount + failedCount > 0;
}

function isSilentFailure(outcome: RequestOutcome) {
  return (
    isAborted(outcome) ||
    (!outcome.ok && outcome.error.code === ankiUnreachableCode)
  );
}
