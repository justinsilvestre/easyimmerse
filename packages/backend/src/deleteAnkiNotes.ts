import type { AnkiConnection, AnkiDeletionOutcome } from "@easyimmerse/state";
import type {
  AnkiPendingDeletion,
  AnkiPendingDeletions,
} from "@easyimmerse/types";
import type { AnkiConnect } from "./ankiConnect.ts";
import {
  ankiConnectActions,
  flashcardNoteQuery,
} from "./ankiConnectActions.ts";
import { ankiBackendError, isUnreachable } from "./ankiConnectError.ts";
import type { BackendRequest, BackendResult } from "./backendClient.ts";
import type { ServerQuery } from "./sendToAnki.ts";

/** What a deletion from Anki works with: AnkiConnect, the server, and where to report that Anki stopped answering. */
export type AnkiDeletionDeps = {
  anki: AnkiConnect;
  server: ServerQuery;
  reportConnection: (connection: AnkiConnection) => void;
};

/** The outcome of a run that has carried out no deletion yet. */
const noDeletion: AnkiDeletionOutcome = {
  deletedCount: 0,
  remainingCount: 0,
  unrecordedCount: 0,
};

/**
 * Carries out the project's pending deletions, oldest first: deletes from Anki, with their cards, the notes that hold
 * each deleted flashcard's id, found as a send finds them, and tells the server the deletion is done, whether or not
 * Anki held a note. When Anki stops answering, the deletions not yet done stay pending for the next time.
 * A deletion the server cannot record stays pending too, and the run goes on with the next.
 */
export async function deleteAnkiNotes(
  projectId: string,
  deps: AnkiDeletionDeps,
): Promise<BackendResult<AnkiDeletionOutcome>> {
  const listed = await deps.server(listRequest(projectId));
  if ("error" in listed) return listed;
  const { deletions } = listed.data as AnkiPendingDeletions;
  let outcome = noDeletion;
  for (const [index, deletion] of deletions.entries()) {
    const done = await carryOut(projectId, deletion, deps);
    if ("error" in done) return done;
    if (done.data === null)
      return { data: { ...outcome, remainingCount: deletions.length - index } };
    outcome = withDeletion(outcome, done.data);
  }
  return { data: outcome };
}

/** What carrying out one deletion did: how many notes Anki deleted, and whether the server recorded the deletion as done. */
type DeletionDone = { deletedCount: number; isRecorded: boolean };

/** Carries out one deletion and resolves what it did, or null when Anki does not answer. */
async function carryOut(
  projectId: string,
  deletion: AnkiPendingDeletion,
  deps: AnkiDeletionDeps,
): Promise<BackendResult<DeletionDone | null>> {
  const deleted = await deleteNotes(deps, deletion);
  if ("error" in deleted) return deleted;
  if (deleted.data === null) return { data: null };
  const cleared = await deps.server(clearRequest(projectId, deletion));
  return {
    data: { deletedCount: deleted.data, isRecorded: !("error" in cleared) },
  };
}

function withDeletion(
  outcome: AnkiDeletionOutcome,
  { deletedCount, isRecorded }: DeletionDone,
): AnkiDeletionOutcome {
  return {
    ...outcome,
    deletedCount: outcome.deletedCount + deletedCount,
    unrecordedCount: outcome.unrecordedCount + (isRecorded ? 0 : 1),
  };
}

/** Deletes the notes of one deleted flashcard and resolves how many there were, or null when Anki does not answer. */
async function deleteNotes(
  { anki, reportConnection }: AnkiDeletionDeps,
  { flashcard_id }: AnkiPendingDeletion,
): Promise<BackendResult<number | null>> {
  try {
    const noteIds = await anki.invoke<number[]>(
      ankiConnectActions.findNotes(flashcardNoteQuery(flashcard_id)),
    );
    if (noteIds.length > 0)
      await anki.invoke(ankiConnectActions.deleteNotes(noteIds));
    return { data: noteIds.length };
  } catch (error) {
    if (!isUnreachable(error)) return { error: ankiBackendError(error) };
    reportConnection({ connected: false });
    return { data: null };
  }
}

function listRequest(projectId: string): BackendRequest {
  return {
    method: "GET",
    path: `/projects/${projectId}/anki/pending-deletions`,
  };
}

function clearRequest(
  projectId: string,
  { flashcard_id }: AnkiPendingDeletion,
): BackendRequest {
  return {
    method: "DELETE",
    path: `/projects/${projectId}/anki/pending-deletions/${flashcard_id}`,
  };
}
