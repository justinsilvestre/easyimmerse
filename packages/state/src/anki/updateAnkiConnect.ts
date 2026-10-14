import type { AppAction } from "../app/appAction.ts";
import { updated } from "../app/updated.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { isSettled } from "../server/isSettled.ts";
import { cachedFlashcards } from "./ankiCache.ts";
import { isUnsent, oldestFirst } from "./ankiExportSelection.ts";
import {
  ankiRequestIds,
  checkAnkiConnection,
  sendToAnki,
  setDestination,
} from "./ankiRequests.ts";

/**
 * Opens and closes the dialog that explains how to set up AnkiConnect.
 * Confirming it makes AnkiConnect the project's destination and checks whether Anki can be reached.
 */
export function updateAnkiConnectSetup(
  isOpen: boolean,
  action: AppAction,
  projectId: string,
) {
  switch (action.type) {
    case "ankiConnectSetupOpened":
      return updated(true);
    case "ankiConnectSetupClosed":
      return updated(false);
    case "ankiConnectSetupRequested":
      return updated(
        false,
        setDestination(projectId, "anki_connect"),
        checkAnkiConnection,
      );
    default:
      return updated(isOpen);
  }
}

/**
 * Returns the effects of the project overview's AnkiConnect actions, which change no state:
 * a check whether Anki can be reached, as asked for or once the overview has read that the project sends to Anki;
 * a send of every flashcard Anki has no note for, oldest first; and the clearing of the project's destination.
 */
export function ankiConnectEffects(
  action: AppAction,
  projectId: string,
  backend: ServerCacheSlice,
) {
  switch (action.type) {
    case "ankiConnectionCheckRequested":
      return [checkAnkiConnection];
    case "ankiSendRequested":
      return sendUnsent(projectId, backend);
    case "flashcardDestinationCleared":
      return [setDestination(projectId, null)];
    case "requestSettled":
      return isSettled(
        action,
        ankiRequestIds(projectId).destinationRead,
        "getProject",
      ) &&
        action.outcome.ok &&
        action.outcome.data.flashcard_destination === "anki_connect"
        ? [checkAnkiConnection]
        : [];
    default:
      return [];
  }
}

function sendUnsent(projectId: string, backend: ServerCacheSlice) {
  const unsent = cachedFlashcards(backend, projectId).filter(isUnsent);
  if (unsent.length === 0) return [];
  return [
    sendToAnki(
      projectId,
      oldestFirst(unsent).map(({ id }) => id),
    ),
  ];
}
