import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import { show } from "./flashcardNotices.ts";

/** The prefix of the ids of the requests that unsuspend a flashcard, each of which takes the first id free under it. */
const unsuspendPrefix = (flashcardId: string) =>
  `flashcard/${flashcardId}/unsuspend`;

/** Brings a flashcard the user suspended back into the review. */
export function sendUnsuspend(projectId: string, flashcardId: string) {
  return {
    type: "sendRequestWithFreeId",
    prefix: unsuspendPrefix(flashcardId),
    request: { kind: "liftReviewHold", projectId, flashcardId },
  } satisfies Effect;
}

/** Tells of an unsuspension that failed. */
export function unsuspendSettled(action: AppAction): Effect[] {
  if (
    action.type !== "requestSettled" ||
    action.request.kind !== "liftReviewHold" ||
    !action.id.startsWith(unsuspendPrefix(action.request.flashcardId)) ||
    action.outcome.ok
  )
    return [];
  return [
    show(transientNotice("danger", "The flashcard could not be unsuspended.")),
  ];
}
