import type { AppAction } from "../app/appAction.ts";
import { selectFlashcardForm } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import type {
  RequestFailure,
  RequestSettled,
} from "../server/serverRequest.ts";
import { type FailedSave, selectFailedSave } from "./failedSave.ts";
import { type FailedCard, keepFailedSave } from "./failedSaveCommands.ts";
import { isCardOf } from "./flashcardCard.ts";
import type { FlashcardApp, Rollback } from "./flashcardForm.ts";
import { flashcardNotices, show } from "./flashcardNotices.ts";
import type { SavePurpose } from "./flashcardRequests.ts";
import { saveLanded } from "./saveLanded.ts";

/** The end of a request that writes a flashcard. */
export type FlashcardSettled = Extract<
  RequestSettled,
  { request: { kind: "saveFlashcard" | "deleteFlashcard" } }
>;

type Settled<K> = Extract<FlashcardSettled, { request: { kind: K } }>;
type CardSave = Extract<SavePurpose, { type: "save" }>;

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

/**
 * Keeps a card whose save failed after it left the form, or updates the failed save a Retry sent; nothing is sent again.
 * The form's own save is left to the form, as is a save of the flashcard the form holds, since the form's copy is newer.
 * A save that ran out of time may still land, so its card is in doubt.
 */
function cardSaveFailed(
  { id, request }: Settled<"saveFlashcard">,
  error: RequestFailure,
  app: FlashcardApp,
) {
  const purpose = request.purpose as CardSave;
  const form = selectFlashcardForm(app);
  if (form && isCardOf(form.card, request.flashcardId)) return [];
  const listed = selectFailedSave(app, request.flashcardId);
  if (purpose.from === "retry" && listed === undefined) return [];
  // A waiting Retry aborted because an earlier save landed also counts as in doubt here. That is harmless:
  // the landing forgot the failed save, so the line above returns before this.
  const doubt: Rollback | null =
    error.status === "ABORTED"
      ? { content: purpose.before, retryRequestId: null }
      : null;
  const failedCard = (
    listed
      ? {
          card: listed.card,
          projectId: listed.projectId,
          rollbackIfDiscarded: rollbackAfterRetry(listed, id, doubt),
        }
      : {
          card: purpose.card,
          projectId: request.projectId,
          rollbackIfDiscarded: purpose.rollbackIfDiscarded ?? doubt,
        }
  ) satisfies FailedCard;
  return keepFailedSave(failedCard, error, app);
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

/** A failed save's doubt once its Retry has failed: kept, or begun by a time-out, or ended by any other failure of the Retry that began it. */
function rollbackAfterRetry(
  listed: FailedSave,
  retryId: string,
  doubt: Rollback | null,
): Rollback | null {
  const rollback = listed.rollbackIfDiscarded;
  if (rollback === null) return doubt;
  if (rollback.retryRequestId !== retryId) return rollback;
  return doubt && { ...rollback, retryRequestId: null };
}
