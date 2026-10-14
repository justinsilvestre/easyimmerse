import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { isAborted } from "../server/isAborted.ts";
import type {
  RequestOutcome,
  RequestSettled,
} from "../server/serverRequest.ts";
import { cachedDestination } from "./ankiCache.ts";
import {
  ankiUnreachableCode,
  sendFailedNotice,
  sentNotice,
} from "./ankiNotices.ts";
import { sendToAnki } from "./ankiRequests.ts";

/**
 * Returns the effects of AnkiConnect sends that belong to no screen:
 * a flashcard saved in a project whose flashcards go to Anki through AnkiConnect is sent there once its save lands,
 * and every send's outcome is told of, except that Anki could not be reached: the project screen's panel shows that,
 * and a notice would repeat it after every save while Anki is closed.
 * A failed send leaves its flashcards unsent until the next save or Send.
 */
export function ankiCommands(
  action: AppAction,
  app: Pick<ReadableState, "backend">,
) {
  if (action.type !== "requestSettled") return [];
  return [...sendSaved(action, app), ...sendNotices(action)];
}

function sendSaved(
  action: RequestSettled,
  { backend }: Pick<ReadableState, "backend">,
) {
  const { request, outcome } = action;
  if (request.kind !== "saveFlashcard" || !outcome.ok) return [];
  const { projectId, flashcardId } = request;
  return cachedDestination(backend, projectId) === "anki_connect"
    ? [sendToAnki(projectId, [flashcardId])]
    : [];
}

function sendNotices(action: RequestSettled) {
  if (action.request.kind !== "sendFlashcardsToAnki") return [];
  const { outcome } = action as Extract<
    RequestSettled,
    { request: { kind: "sendFlashcardsToAnki" } }
  >;
  if (outcome.ok) return [sentNotice(outcome.data)];
  return isSilentFailure(outcome) ? [] : [sendFailedNotice(outcome.error)];
}

function isSilentFailure(outcome: RequestOutcome<"sendFlashcardsToAnki">) {
  return (
    isAborted(outcome) ||
    (!outcome.ok && outcome.error.code === ankiUnreachableCode)
  );
}
