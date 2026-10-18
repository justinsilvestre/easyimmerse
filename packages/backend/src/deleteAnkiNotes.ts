import {
  type AnkiConnection,
  type AnkiDeletionOutcome,
  flashcardNoteQuery,
} from "@easyimmerse/state";
import type {
  AnkiPendingDeletion,
  AnkiPendingDeletions,
} from "@easyimmerse/types";
import type { AnkiConnect } from "./ankiConnect.ts";
import { ankiConnectActions } from "./ankiConnectActions.ts";
import {
  ankiBackendError,
  isUnreachable,
  lostConnectionOf,
} from "./ankiConnectError.ts";
import type { BackendRequest, BackendResult } from "./backendClient.ts";
import type { ServerQuery } from "./sendToAnki.ts";

/** What a deletion from Anki works with: AnkiConnect, the server, and where to report whether Anki answered. */
export type AnkiDeletionDeps = {
  anki: AnkiConnect;
  server: ServerQuery;
  /** Records whether Anki answered, and tells whether it answered although the app had not known it to be running. */
  reportConnection: (connection: AnkiConnection) => boolean;
};

/** The outcome of a run that has carried out no deletion yet. */
const noDeletion: AnkiDeletionOutcome = {
  deletedCount: 0,
  deletedFlashcardIds: [],
  remainingFlashcardIds: [],
  unrecordedCount: 0,
  foundAnki: false,
};

/**
 * Carries out the project's pending deletions, oldest first: deletes from Anki, with their cards, the notes that hold
 * each deleted flashcard's id, found as a send finds them, and tells the server the deletion is done, whether or not
 * Anki held a note. When Anki stops answering, the deletions not yet done stay pending for the next time.
 * A deletion the server cannot record stays pending too, and the run goes on with the next.
 * Anki is asked nothing when no deletion is pending.
 */
export async function deleteAnkiNotes(
  projectId: string,
  deps: AnkiDeletionDeps,
): Promise<BackendResult<AnkiDeletionOutcome>> {
  const listed = await deps.server(listRequest(projectId));
  if ("error" in listed) return listed;
  const { deletions } = listed.data as AnkiPendingDeletions;
  if (deletions.length === 0) return { data: noDeletion };
  const reached = await reachAnki(deps);
  if ("error" in reached) return reached;
  if (reached.data === null)
    return { data: { ...noDeletion, remainingFlashcardIds: idsOf(deletions) } };
  return carryOutAll(projectId, deletions, deps, reached.data);
}

/** Asks Anki for its version and resolves whether Anki answered although the app had not known it to be running, or null when it does not answer. */
async function reachAnki({
  anki,
  reportConnection,
}: AnkiDeletionDeps): Promise<BackendResult<boolean | null>> {
  try {
    const version = await anki.invoke<number>(ankiConnectActions.version());
    return { data: reportConnection({ connected: true, version }) };
  } catch (error) {
    return unanswered(error, reportConnection);
  }
}

async function carryOutAll(
  projectId: string,
  deletions: readonly AnkiPendingDeletion[],
  deps: AnkiDeletionDeps,
  foundAnki: boolean,
): Promise<BackendResult<AnkiDeletionOutcome>> {
  let outcome = { ...noDeletion, foundAnki };
  for (const [index, deletion] of deletions.entries()) {
    const done = await carryOut(projectId, deletion, deps);
    if ("error" in done) return done;
    if (done.data === null)
      return {
        data: {
          ...outcome,
          remainingFlashcardIds: idsOf(deletions.slice(index)),
        },
      };
    outcome = withDeletion(outcome, deletion, done.data);
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
  { flashcard_id }: AnkiPendingDeletion,
  { deletedCount, isRecorded }: DeletionDone,
): AnkiDeletionOutcome {
  return {
    ...outcome,
    deletedCount: outcome.deletedCount + deletedCount,
    deletedFlashcardIds:
      deletedCount > 0
        ? [...outcome.deletedFlashcardIds, flashcard_id]
        : outcome.deletedFlashcardIds,
    unrecordedCount: outcome.unrecordedCount + (isRecorded ? 0 : 1),
  };
}

function idsOf(deletions: readonly AnkiPendingDeletion[]): string[] {
  return deletions.map(({ flashcard_id }) => flashcard_id);
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
    return unanswered(error, reportConnection);
  }
}

/**
 * Resolves null and reports Anki as not connected when Anki does not answer at all.
 * Otherwise fails with Anki's error, reporting first that Anki refused easyImmerse when it did.
 */
function unanswered(
  error: unknown,
  reportConnection: AnkiDeletionDeps["reportConnection"],
): BackendResult<null> {
  const lost = lostConnectionOf(error);
  if (lost !== null) reportConnection(lost);
  return isUnreachable(error)
    ? { data: null }
    : { error: ankiBackendError(error) };
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
