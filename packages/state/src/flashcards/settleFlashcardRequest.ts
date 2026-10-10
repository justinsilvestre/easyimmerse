import type { AppAction } from "../app/appAction.ts";
import type { RequestSettled } from "../server/serverRequest.ts";
import { cardSaveFailed } from "./cardSaveFailed.ts";
import type { FlashcardApp } from "./flashcardApp.ts";
import { flashcardNotices, show } from "./flashcardNotices.ts";
import { saveLanded } from "./saveLanded.ts";

/** The end of a request that writes a flashcard. */
export type FlashcardSettled = Extract<
  RequestSettled,
  { request: { kind: "saveFlashcard" | "deleteFlashcard" } }
>;

type Settled<K> = Extract<FlashcardSettled, { request: { kind: K } }>;

/**
 * Takes the outcome of a request that writes a flashcard: a save that landed as `saveLanded` describes,
 * a failed card save as `cardSaveFailed` describes, and the deletions. A failed Undo or rollback is told of.
 */
export function settleFlashcardRequest(
  settled: FlashcardSettled,
  app: FlashcardApp,
) {
  if (settled.request.kind === "deleteFlashcard")
    return settleDeletion(settled as Settled<"deleteFlashcard">);
  const save = settled as Settled<"saveFlashcard">;
  if (save.outcome.ok) return saveLanded(save, app);
  const { purpose } = save.request;
  if (purpose.type === "save")
    return cardSaveFailed(save, save.outcome.error, app);
  return [show(flashcardNotices.undoFailed(purpose.word))];
}

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

/** Tells of a failed deletion, counting a rollback's deletion of a flashcard that was never created as done. */
function settleDeletion({ request, outcome }: Settled<"deleteFlashcard">) {
  const { purpose } = request;
  const isGone =
    outcome.ok || (purpose.type === "rollback" && outcome.error.status === 404);
  if (isGone) return [];
  return [
    show(
      purpose.type === "delete"
        ? flashcardNotices.deleteFailed()
        : flashcardNotices.undoFailed(purpose.word),
    ),
  ];
}
