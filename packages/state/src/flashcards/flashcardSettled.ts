import type { AppAction } from "../app/appAction.ts";
import type { RequestSettled } from "../server/serverRequest.ts";

/** The end of a request that writes a flashcard. */
export type FlashcardSettled = Extract<
  RequestSettled,
  { request: { kind: "saveFlashcard" | "deleteFlashcard" } }
>;

/** Tells whether the action is the end of a request that writes a flashcard. */
export function isFlashcardSettled(
  action: AppAction,
): action is FlashcardSettled {
  return (
    action.type === "requestSettled" &&
    (action.request.kind === "saveFlashcard" ||
      action.request.kind === "deleteFlashcard")
  );
}
