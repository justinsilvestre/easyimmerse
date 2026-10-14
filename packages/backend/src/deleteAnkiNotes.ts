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

/**
 * Carries out the project's pending deletions, oldest first: deletes from Anki, with their cards, the notes that hold
 * each deleted flashcard's id, found as a send finds them, and tells the server the deletion is done, whether or not
 * Anki held a note. When Anki stops answering, the deletions not yet done stay pending for the next time.
 */
export async function deleteAnkiNotes(
  projectId: string,
  deps: AnkiDeletionDeps,
): Promise<BackendResult<AnkiDeletionOutcome>> {
  const listed = await deps.server(listRequest(projectId));
  if ("error" in listed) return listed;
  const { deletions } = listed.data as AnkiPendingDeletions;
  let deletedCount = 0;
  for (const [index, deletion] of deletions.entries()) {
    const deleted = await deleteNotes(deps, deletion);
    if ("error" in deleted) return deleted;
    if (deleted.data === null) {
      const remainingCount = deletions.length - index;
      return { data: { deletedCount, remainingCount } };
    }
    deletedCount += deleted.data;
    const cleared = await deps.server(clearRequest(projectId, deletion));
    if ("error" in cleared) return cleared;
  }
  return { data: { deletedCount, remainingCount: 0 } };
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
