import { selectFlashcardForm } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import type { RequestFailure } from "../server/serverRequest.ts";
import type { FailedSave } from "./failedSave.ts";
import { type FailedCard, keepFailedSave } from "./failedSaveKeeping.ts";
import { selectFailedSave } from "./failedSaveSelectors.ts";
import type { FlashcardApp } from "./flashcardApp.ts";
import type { Rollback } from "./flashcardForm.ts";
import type { SavePurpose } from "./flashcardRequests.ts";
import { isCardOf } from "./latestFlashcard.ts";
import type { FlashcardSettled } from "./settleFlashcardRequest.ts";

type Save = Extract<FlashcardSettled, { request: { kind: "saveFlashcard" } }>;
type CardSave = Extract<SavePurpose, { type: "save" }>;

/**
 * Keeps a card whose save failed after it left the form, or updates the failed save a Retry sent; nothing is sent again.
 * The form's own save is left to the form, as is a save of the flashcard the form holds, since the form's copy is newer.
 * A save that ran out of time may still land, so its card is in doubt.
 */
export function cardSaveFailed(
  { id, request }: Save,
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
