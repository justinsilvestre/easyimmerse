import type { FailedSave } from "./failedSave.ts";
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
import type { FlashcardsState } from "./flashcardsState.ts";
import { retryOf } from "./latestFlashcard.ts";

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

/** Lists a discarded failed save again. */
export function restoreFailedSave(
  state: FlashcardsState,
  failedSave: FailedSave,
): FlashcardsState {
  return changeFailedSave(state, failedSave);
}
