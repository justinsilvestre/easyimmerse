import type { RequestFailure } from "../server/serverRequest.ts";
import {
  createFailedSave,
  type FailedSave,
  failedSaveIdOf,
} from "./failedSave.ts";
import { noticeOfListing, withFailedSave } from "./failedSaveListing.ts";
import type { Rollback } from "./flashcardForm.ts";
import type { SavePurpose } from "./flashcardRequests.ts";
import type { FlashcardSettled } from "./flashcardSettled.ts";
import type { FlashcardsContext } from "./flashcardsContext.ts";
import { formOf } from "./flashcardsOnScreen.ts";
import type { FlashcardsState } from "./flashcardsState.ts";
import { isSaveRefused } from "./isSaveRefused.ts";
import { isCardOf } from "./latestFlashcard.ts";

type Save = Extract<FlashcardSettled, { request: { kind: "saveFlashcard" } }>;
type CardSave = Extract<SavePurpose, { type: "save" }>;

/**
 * Lists a card whose save failed after it left the form, or updates the failed save a Retry sent; nothing is sent again.
 * The form's own save is left to the form, as is a save of the flashcard the form holds, since the form's copy is newer.
 * A save that ran out of time may still land, so its card is in doubt.
 */
export function cardSaveFailed(
  state: FlashcardsState,
  { id, request }: Save,
  error: RequestFailure,
  { app, outbox }: FlashcardsContext,
): FlashcardsState {
  const purpose = request.purpose as CardSave;
  const form = formOf(app);
  if (form && isCardOf(form.card, request.flashcardId)) return state;
  const listed = state.failedSaves.find(
    (failedSave) => failedSaveIdOf(failedSave) === request.flashcardId,
  );
  if (purpose.from === "retry" && listed === undefined) return state;
  const doubt: Rollback | null =
    error.status === "ABORTED"
      ? { content: purpose.before, retryRequestId: null }
      : null;
  const failedSave: FailedSave = listed
    ? { ...listed, rollbackIfDiscarded: rollbackAfterRetry(listed, id, doubt) }
    : createFailedSave(
        purpose.card,
        request.projectId,
        false,
        purpose.rollbackIfDiscarded ?? doubt,
      );
  const refused = { ...failedSave, isRefused: isSaveRefused(error) };
  outbox.add(noticeOfListing(refused));
  return { ...state, failedSaves: withFailedSave(state.failedSaves, refused) };
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
