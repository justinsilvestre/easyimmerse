import type { FlashcardDestination } from "@easyimmerse/types";
import type { Effect } from "../app/effect.ts";

/** The ids of the requests the project overview sends about where a project's flashcards go. */
export const ankiRequestIds = (projectId: string) => ({
  export: `project/${projectId}/ankiExport`,
  destination: `project/${projectId}/flashcardDestination`,
  /** The read of the project as its overview opens, which tells whether to check the connection to Anki. */
  destinationRead: `project/${projectId}/destinationRead`,
});

/** The id of the check whether Anki can be reached, of which one runs at a time. */
export const ankiConnectionCheckId = "ankiConnection";

/** Sends to Anki the given flashcards of a project, after the project's earlier sends, under an id of its own. */
export function sendToAnki(projectId: string, flashcardIds: readonly string[]) {
  return {
    type: "sendRequestWithFreeId",
    prefix: `project/${projectId}/ankiSend`,
    scope: `ankiSend:${projectId}`,
    request: { kind: "sendFlashcardsToAnki", projectId, flashcardIds },
  } satisfies Effect;
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
