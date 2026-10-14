import type { FlashcardDestination } from "@easyimmerse/types";
import type { Effect } from "../app/effect.ts";
import type { RequestRecord } from "../operations/operations.ts";

/** The ids of the requests the project overview sends about where a project's flashcards go. */
export const ankiRequestIds = (projectId: string) => ({
  export: `project/${projectId}/ankiExport`,
  destination: `project/${projectId}/flashcardDestination`,
  /** The read of the project as its overview opens, which tells whether to check the connection to Anki. */
  destinationRead: `project/${projectId}/destinationRead`,
});

/** The id of the check whether Anki can be reached, of which one runs at a time. */
export const ankiConnectionCheckId = "ankiConnection";

/** The scope of a project's requests to AnkiConnect, which run one at a time in the order they were asked for. */
const ankiScope = (projectId: string) => `ankiSend:${projectId}`;

/** Sends to Anki the given flashcards of a project, after the project's earlier sends, under an id of its own. */
export function sendToAnki(projectId: string, flashcardIds: readonly string[]) {
  return {
    type: "sendRequestWithFreeId",
    prefix: `project/${projectId}/ankiSend`,
    scope: ankiScope(projectId),
    request: { kind: "sendFlashcardsToAnki", projectId, flashcardIds },
  } satisfies Effect;
}

/** Tells whether a send of the project's flashcards to Anki is under way or waiting among the recorded requests. */
export function isSendingTo(
  requests: readonly RequestRecord[],
  projectId: string,
): boolean {
  return requests.some(
    ({ request }) =>
      request.kind === "sendFlashcardsToAnki" &&
      request.projectId === projectId,
  );
}

/** Tells whether any of the project's requests to AnkiConnect, a send or a deletion, is under way or waiting. */
export function isSyncingWith(
  requests: readonly RequestRecord[],
  projectId: string,
): boolean {
  return requests.some(({ scope }) => scope === ankiScope(projectId));
}

/**
 * Deletes from Anki the notes of a project's deleted flashcards, after the project's earlier sends,
 * so that a note a send in flight creates is deleted too. `word` names the flashcard just deleted, if one was.
 */
export function deleteFromAnki(projectId: string, word: string | null) {
  return {
    type: "sendRequestWithFreeId",
    prefix: `project/${projectId}/ankiDelete`,
    scope: ankiScope(projectId),
    request: { kind: "deleteAnkiNotes", projectId, word },
  } satisfies Effect;
}

/** Tells whether a deletion of the project's notes from Anki waits behind its other requests to AnkiConnect. */
export function isDeletionWaiting(
  requests: readonly RequestRecord[],
  projectId: string,
): boolean {
  return requests.some(
    ({ request, isWaiting }) =>
      isWaiting &&
      request.kind === "deleteAnkiNotes" &&
      request.projectId === projectId,
  );
}

/** Asks AnkiConnect whether Anki is running. */
export const checkAnkiConnection = {
  type: "sendRequest",
  id: ankiConnectionCheckId,
  request: { kind: "checkAnkiConnection" },
} satisfies Effect;

/** Sets where a project's flashcards go, or clears it with null. */
export function setDestination(
  projectId: string,
  destination: FlashcardDestination | null,
) {
  return {
    type: "sendRequest",
    id: ankiRequestIds(projectId).destination,
    request: { kind: "setFlashcardDestination", projectId, destination },
  } satisfies Effect;
}

/** Reads the project, to learn where its flashcards go. */
export function readDestination(projectId: string) {
  return {
    type: "sendRequest",
    id: ankiRequestIds(projectId).destinationRead,
    request: { kind: "getProject", projectId },
  } satisfies Effect;
}

/** Exports flashcards as a package saved at `savePath`, or handed back for download when it is null. */
export function exportPackage(
  projectId: string,
  flashcardIds: readonly string[],
  savePath: string | null,
) {
  return {
    type: "sendRequest",
    id: ankiRequestIds(projectId).export,
    request: { kind: "exportAnkiPackage", projectId, flashcardIds, savePath },
  } satisfies Effect;
}
