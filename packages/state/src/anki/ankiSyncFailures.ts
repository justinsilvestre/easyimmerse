import type { Effect } from "../app/effect.ts";
import type { ReadableState } from "../app/feature.ts";
import type { FailedRequest } from "../operations/failedRequests.ts";
import { isAborted } from "../server/isAborted.ts";
import type {
  RequestFailure,
  RequestSettled,
} from "../server/serverRequest.ts";
import { cachedFlashcards } from "./ankiCache.ts";
import { ankiRequestIds } from "./ankiRequests.ts";
import type { AnkiSendOutcome } from "./ankiResponses.ts";
import { isQueued } from "./ankiUpdatesQueue.ts";

type SyncKind = "sendFlashcardsToAnki" | "deleteAnkiNotes";
type SyncSettled = Extract<RequestSettled, { request: { kind: SyncKind } }>;
type FailedRequests = readonly FailedRequest[];
type AnkiSyncApp = Pick<ReadableState, "backend" | "operations">;

/**
 * Keeps the last failed send of a project's flashcards to Anki, and the last failed deletion of its notes from Anki,
 * until any check of the connection to Anki settles, a deletion succeeds, or a send succeeds that held every flashcard in the Anki updates queue.
 * A send of fewer, such as that of a single saved flashcard, leaves the earlier failure kept, since what it left waiting still waits.
 * A send also fails when Anki refused some of its flashcards or the server could not record it.
 * An aborted request neither fails nor succeeds.
 */
export function trackSyncFailures(
  action: RequestSettled,
  { backend, operations }: AnkiSyncApp,
): Effect[] {
  if (action.request.kind === "checkAnkiConnection")
    return operations.failedRequests
      .filter(isSyncFailure)
      .map(({ id }) => forget(id));
  if (!isSyncSettled(action) || isAborted(action.outcome)) return [];
  const { request } = action;
  const id = keptIdOf(request.kind, request.projectId);
  const failure = failureOf(action);
  if (failure !== null) return [keep({ id, request, failure })];
  return request.kind === "deleteAnkiNotes" ||
    heldWholeQueue(request.flashcardIds, request.projectId, backend)
    ? [forget(id)]
    : [];
}

/** Tells whether a send held every flashcard of the project that the cache still lists in the Anki updates queue. */
function heldWholeQueue(
  flashcardIds: readonly string[],
  projectId: string,
  backend: AnkiSyncApp["backend"],
) {
  const held = new Set(flashcardIds);
  return cachedFlashcards(backend, projectId)
    .filter(isQueued)
    .every(({ id }) => held.has(id));
}

/** Forgets the project's failed send and deletion, as the user asks to sync with Anki again. */
export function forgetSyncFailures(projectId: string): Effect[] {
  const { sendFailed, deleteFailed } = ankiRequestIds(projectId);
  return [forget(sendFailed), forget(deleteFailed)];
}

/** Tells whether the project's last send to Anki or its last deletion from Anki failed, and neither was tried again since. */
export function hasSyncFailed(
  failedRequests: FailedRequests,
  projectId: string,
): boolean {
  const { sendFailed, deleteFailed } = ankiRequestIds(projectId);
  return failedRequests.some(
    ({ id }) => id === sendFailed || id === deleteFailed,
  );
}

function isSyncSettled(action: RequestSettled): action is SyncSettled {
  return isSyncKind(action.request.kind);
}

function isSyncFailure({ request }: FailedRequest) {
  return isSyncKind(request.kind);
}

function isSyncKind(kind: string) {
  return kind === "sendFlashcardsToAnki" || kind === "deleteAnkiNotes";
}

function keptIdOf(kind: SyncKind, projectId: string) {
  const ids = ankiRequestIds(projectId);
  return kind === "sendFlashcardsToAnki" ? ids.sendFailed : ids.deleteFailed;
}

function failureOf({ request, outcome }: SyncSettled): RequestFailure | null {
  if (!outcome.ok) return outcome.error;
  return request.kind === "sendFlashcardsToAnki"
    ? partialSendFailure(outcome.data as AnkiSendOutcome)
    : null;
}

/** Describes a send that Anki answered but that left some of its flashcards unsent, or returns null when it left none. */
function partialSendFailure({
  sentCount,
  failedCount,
  isRecorded,
}: AnkiSendOutcome): RequestFailure | null {
  if (failedCount > 0)
    return {
      status: 502,
      code: "anki_failed",
      message: "Anki refused some flashcards.",
    };
  if (sentCount > 0 && !isRecorded)
    return { status: 500, message: "The server could not record the send." };
  return null;
}

function keep(failed: FailedRequest) {
  return { type: "keepFailedRequest", failed } satisfies Effect;
}

function forget(id: string) {
  return { type: "forgetFailedRequest", id } satisfies Effect;
}
