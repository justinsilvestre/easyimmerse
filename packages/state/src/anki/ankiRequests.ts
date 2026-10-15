import type { Effect } from "../app/effect.ts";
import type { RequestRecord } from "../operations/operations.ts";

/** The ids of the requests the project overview sends about how a project's flashcards reach Anki. */
export const ankiRequestIds = (projectId: string) => ({
  export: `project/${projectId}/ankiExport`,
  ankiConnect: `project/${projectId}/ankiConnect`,
  /** The read of the project as its overview opens, which tells whether to check the connection to Anki. */
  projectRead: `project/${projectId}/projectRead`,
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

/** Returns the ids of the flashcards that the project's sends to Anki under way or waiting hold. */
export function flashcardIdsBeingSent(
  requests: readonly RequestRecord[],
  projectId: string,
): ReadonlySet<string> {
  return new Set(
    requests.flatMap(({ request }) =>
      request.kind === "sendFlashcardsToAnki" && request.projectId === projectId
        ? request.flashcardIds
        : [],
    ),
  );
}

/** Tells whether any of the project's requests to AnkiConnect, a send or a deletion, is under way or waiting. */
export function hasAnkiConnectRequest(
  requests: readonly RequestRecord[],
  projectId: string,
): boolean {
  return requests.some(({ scope }) => scope === ankiScope(projectId));
}

/** A flashcard just deleted, with the word that names it to the user. */
export type DeletedFlashcard = { flashcardId: string; word: string };

/**
 * Deletes from Anki the notes of a project's deleted flashcards, after the project's earlier sends,
 * so that a note a send in flight creates is deleted too. `justDeleted` is the flashcard whose deletion asks for this, if one does.
 */
export function deleteFromAnki(
  projectId: string,
  justDeleted: DeletedFlashcard | null,
) {
  return {
    type: "sendRequestWithFreeId",
    prefix: `project/${projectId}/ankiDelete`,
    scope: ankiScope(projectId),
    request: { kind: "deleteAnkiNotes", projectId, justDeleted },
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

/** Turns AnkiConnect on or off for a project. */
export function setAnkiConnect(projectId: string, usesAnkiConnect: boolean) {
  return {
    type: "sendRequest",
    id: ankiRequestIds(projectId).ankiConnect,
    request: { kind: "setAnkiConnect", projectId, usesAnkiConnect },
  } satisfies Effect;
}

/** Reads the project, to learn whether it uses AnkiConnect. */
export function readProject(projectId: string) {
  return {
    type: "sendRequest",
    id: ankiRequestIds(projectId).projectRead,
    request: { kind: "getProject", projectId },
  } satisfies Effect;
}

/** Where an export saves its package, or null to hand it back for download, and whether it marks its flashcards as exported. */
export type PackageDelivery = {
  savePath: string | null;
  marksExported: boolean;
};

/** Exports flashcards as a package, delivered as asked. */
export function exportPackage(
  projectId: string,
  flashcardIds: readonly string[],
  delivery: PackageDelivery,
) {
  return {
    type: "sendRequest",
    id: ankiRequestIds(projectId).export,
    request: {
      kind: "exportAnkiPackage",
      projectId,
      flashcardIds,
      ...delivery,
    },
  } satisfies Effect;
}
