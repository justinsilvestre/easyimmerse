import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import { show } from "./flashcardNotices.ts";

/** The prefix of the ids of the requests that suspend a flashcard, each of which takes the first id free under it. */
const suspendPrefix = (flashcardId: string) =>
  `flashcard/${flashcardId}/suspend`;

/** Leaves a flashcard out of the review until the user unsuspends it. */
export function sendSuspend(projectId: string, flashcardId: string) {
  return {
    type: "sendRequestWithFreeId",
    prefix: suspendPrefix(flashcardId),
    request: {
      kind: "holdReviewCard",
      projectId,
      flashcardId,
      hold: "suspended",
    },
  } satisfies Effect;
}

/** Tells of a suspension that failed. */
export function suspendSettled(action: AppAction): Effect[] {
  if (
    action.type !== "requestSettled" ||
    action.request.kind !== "holdReviewCard" ||
    !action.id.startsWith(suspendPrefix(action.request.flashcardId)) ||
    action.outcome.ok
  )
    return [];
  return [
    show(transientNotice("danger", "The flashcard could not be suspended.")),
  ];
}
