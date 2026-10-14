import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { cacheEntry, type ServerCacheSlice } from "../server/cacheEntry.ts";
import { isSettled } from "../server/isSettled.ts";
import type { RequestSettled } from "../server/serverRequest.ts";
import { cachedDestination, cachedFlashcards } from "./ankiCache.ts";
import { isUnsent, oldestFirst } from "./ankiExportSelection.ts";
import {
  ankiConnectionCheckId,
  ankiRequestIds,
  checkAnkiConnection,
  deleteFromAnki,
  flashcardIdsBeingSent,
  isDeletionWaiting,
  sendToAnki,
  setDestination,
} from "./ankiRequests.ts";

type AnkiConnectApp = Pick<ReadableState, "backend" | "operations">;

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
 * a send of every flashcard Anki has no note for, oldest first, followed by the deletion of the notes of deleted flashcards
 * that Anki could not be reached for, as asked for or once Anki is found running;
 * and the clearing of the project's destination.
 */
export function ankiConnectEffects(
  action: AppAction,
  projectId: string,
  app: AnkiConnectApp,
) {
  switch (action.type) {
    case "ankiConnectionCheckRequested":
      return [checkAnkiConnection];
    case "ankiSendRequested":
      return syncWithAnki(projectId, app);
    case "flashcardDestinationCleared":
      return [setDestination(projectId, null)];
    case "requestSettled":
      return [
        ...checkOnRead(action, projectId),
        ...syncOnceConnected(action, projectId, app),
      ];
    default:
      return [];
  }
}

/** Checks the connection once the overview has read that the project sends to Anki. */
function checkOnRead(action: RequestSettled, projectId: string) {
  return isSettled(
    action,
    ankiRequestIds(projectId).destinationRead,
    "getProject",
  ) &&
    action.outcome.ok &&
    // RTK Query can settle a read it skipped without data, so the project may be missing.
    action.outcome.data?.flashcard_destination === "anki_connect"
    ? [checkAnkiConnection]
    : [];
}

/**
 * Syncs the project with Anki once Anki is known to run and the project is known to send there,
 * whichever of the check and the setting of the destination lands last.
 */
function syncOnceConnected(
  action: RequestSettled,
  projectId: string,
  app: AnkiConnectApp,
) {
  const isReady =
    (hasFoundAnki(action) &&
      cachedDestination(app.backend, projectId) === "anki_connect") ||
    (hasSetAnkiConnect(action, projectId) && isAnkiConnected(app.backend));
  return isReady ? syncWithAnki(projectId, app) : [];
}

/**
 * Sends the flashcards Anki has no note for, and then deletes the notes of deleted flashcards.
 * A flashcard that a send under way or waiting already holds is left to that send,
 * and nothing is deleted while a deletion waits, since that deletion will list every pending one when it starts.
 */
function syncWithAnki(projectId: string, app: AnkiConnectApp) {
  const { requests } = app.operations;
  return [
    ...sendUnsent(projectId, app),
    ...(isDeletionWaiting(requests, projectId)
      ? []
      : [deleteFromAnki(projectId, null)]),
  ];
}

function hasFoundAnki(action: RequestSettled) {
  return (
    isSettled(action, ankiConnectionCheckId, "checkAnkiConnection") &&
    action.outcome.ok &&
    action.outcome.data.connected
  );
}

function hasSetAnkiConnect(action: RequestSettled, projectId: string) {
  return (
    isSettled(
      action,
      ankiRequestIds(projectId).destination,
      "setFlashcardDestination",
    ) &&
    action.outcome.ok &&
    action.outcome.data.flashcard_destination === "anki_connect"
  );
}

/** Tells whether the last check found Anki running and no check is under way. */
function isAnkiConnected(backend: ServerCacheSlice) {
  const check = cacheEntry(backend, "checkAnkiConnection", undefined);
  return check?.status === "fulfilled" && check.data?.connected === true;
}

function sendUnsent(
  projectId: string,
  { backend, operations }: AnkiConnectApp,
) {
  const beingSent = flashcardIdsBeingSent(operations.requests, projectId);
  const unsent = cachedFlashcards(backend, projectId).filter(
    (flashcard) => isUnsent(flashcard) && !beingSent.has(flashcard.id),
  );
  if (unsent.length === 0) return [];
  return [
    sendToAnki(
      projectId,
      oldestFirst(unsent).map(({ id }) => id),
    ),
  ];
}
