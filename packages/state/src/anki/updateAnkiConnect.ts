import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { isSettled } from "../server/isSettled.ts";
import type { RequestSettled } from "../server/serverRequest.ts";
import {
  cachedDeletions,
  cachedIsAnkiConnected,
  cachedUsesAnkiConnect,
} from "./ankiCache.ts";
import {
  ankiConnectionCheckId,
  ankiRequestIds,
  checkAnkiConnection,
  clearDeletions,
  setAnkiConnect,
} from "./ankiRequests.ts";
import { syncWithAnki } from "./syncWithAnki.ts";

type AnkiConnectApp = Pick<ReadableState, "backend" | "operations">;

/**
 * Opens and closes the dialog that explains how to set up AnkiConnect.
 * Confirming it turns AnkiConnect on for the project and checks whether Anki can be reached.
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
        setAnkiConnect(projectId, true),
        checkAnkiConnection,
      );
    default:
      return updated(isOpen);
  }
}

/**
 * Returns the effects of the project overview's AnkiConnect actions, which change no state:
 * a check whether Anki can be reached, as asked for or once the overview has read that the project uses AnkiConnect;
 * a send of every flashcard Anki has no note for, oldest first, followed by the deletion of the notes of deleted flashcards
 * that Anki could not be reached for, as asked for or once Anki is found running;
 * the turning off of AnkiConnect; and the clearing of the deletions the panel lists, which the user marked done.
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
    case "ankiConnectTurnedOff":
      return [setAnkiConnect(projectId, false)];
    case "ankiDeletionsMarkedDone":
      return markedDone(projectId, app);
    case "requestSettled":
      return [
        ...checkOnRead(action, projectId),
        ...syncOnceConnected(action, projectId, app),
      ];
    default:
      return [];
  }
}

/** Clears the deletions as cached, which are the ones the panel lists, so that a deletion recorded since stays. */
function markedDone(projectId: string, { backend }: AnkiConnectApp) {
  const ids = cachedDeletions(backend, projectId).map(
    ({ flashcard_id }) => flashcard_id,
  );
  return ids.length === 0 ? [] : [clearDeletions(projectId, ids)];
}

/** Checks the connection once the overview has read that the project uses AnkiConnect. */
function checkOnRead(action: RequestSettled, projectId: string) {
  return isSettled(
    action,
    ankiRequestIds(projectId).projectRead,
    "getProject",
  ) &&
    action.outcome.ok &&
    // RTK Query can settle a read it skipped without data, so the project may be missing.
    action.outcome.data?.uses_anki_connect === true
    ? [checkAnkiConnection]
    : [];
}

/**
 * Syncs the project with Anki once Anki is known to run and the project is known to use AnkiConnect,
 * whichever of the check and the turning on of AnkiConnect lands last.
 */
function syncOnceConnected(
  action: RequestSettled,
  projectId: string,
  app: AnkiConnectApp,
) {
  const isReady =
    (hasFoundAnki(action) && cachedUsesAnkiConnect(app.backend, projectId)) ||
    (hasSetAnkiConnect(action, projectId) &&
      cachedIsAnkiConnected(app.backend));
  return isReady ? syncWithAnki(projectId, app) : [];
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
      ankiRequestIds(projectId).ankiConnect,
      "setAnkiConnect",
    ) &&
    action.outcome.ok &&
    action.outcome.data.uses_anki_connect
  );
}
