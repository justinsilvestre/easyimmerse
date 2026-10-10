import { type FailedSave, failedSaveIdOf } from "./failedSave.ts";
import {
  changeFailedSave,
  findFailedSave,
  withoutFailedSave,
} from "./failedSaveListing.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
} from "./flashcardNotices.ts";
import { rollbackRequest } from "./flashcardSaves.ts";
import type { FlashcardsContext } from "./flashcardsContext.ts";
import { formOf } from "./flashcardsOnScreen.ts";
import type { FlashcardsState } from "./flashcardsState.ts";
import { isCardOf, retryOf } from "./latestFlashcard.ts";

/**
 * Throws a failed save's edits away, with an undo toast that lists it again, and takes back a save of it in doubt.
 * It does nothing while a Retry of the card is under way.
 */
export function discardFailedSave(
  state: FlashcardsState,
  flashcardId: string,
  { app, outbox }: FlashcardsContext,
): FlashcardsState {
  const failedSave = findFailedSave(state, flashcardId);
  if (!failedSave || retryOf(app, flashcardId)) return state;
  const { card, projectId, rollbackIfDiscarded } = failedSave;
  outbox.add(
    withdraw(flashcardNoticeKeys.saveRefused(flashcardId)),
    show(
      flashcardNotices.failedSaveDiscarded({
        ...failedSave,
        rollbackIfDiscarded: null,
        isOpening: false,
      }),
    ),
  );
  if (rollbackIfDiscarded)
    outbox.send(rollbackRequest(rollbackIfDiscarded, card, projectId));
  return {
    ...state,
    failedSaves: withoutFailedSave(state.failedSaves, flashcardId),
  };
}

/** Lists a discarded failed save again, unless the form holds its flashcard meanwhile, whose copy is then the newer one. */
export function restoreFailedSave(
  state: FlashcardsState,
  failedSave: FailedSave,
  { app }: FlashcardsContext,
): FlashcardsState {
  const form = formOf(app);
  return form && isCardOf(form.card, failedSaveIdOf(failedSave))
    ? state
    : changeFailedSave(state, failedSave);
}
