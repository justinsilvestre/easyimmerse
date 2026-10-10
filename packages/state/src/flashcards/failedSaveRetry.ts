import { failedSaveIdOf } from "./failedSave.ts";
import { findFailedSave } from "./failedSaveListing.ts";
import { askSave } from "./flashcardSaves.ts";
import type { FlashcardsContext } from "./flashcardsContext.ts";
import type { FlashcardsState } from "./flashcardsState.ts";
import { retryOf } from "./latestFlashcard.ts";

/**
 * Sends a failed save again under its first flashcard id, unless it was refused or its Retry is under way.
 * A failed save waiting to open keeps waiting, so that it still opens if the Retry fails.
 */
export function retryFailedSave(
  state: FlashcardsState,
  flashcardId: string,
  context: FlashcardsContext,
): FlashcardsState {
  const failedSave = findFailedSave(state, flashcardId);
  if (!failedSave || failedSave.isRefused || retryOf(context.app, flashcardId))
    return state;
  const { card, projectId, rollbackIfDiscarded } = failedSave;
  askSave(
    { card, projectId, from: "retry", offersUndo: false, rollbackIfDiscarded },
    context.app,
    context.outbox,
  );
  return state;
}

/** Sends every failed save again, as `retryFailedSave` does. */
export function retryAllFailedSaves(
  state: FlashcardsState,
  context: FlashcardsContext,
): FlashcardsState {
  return state.failedSaves.reduce(
    (next, failedSave) =>
      retryFailedSave(next, failedSaveIdOf(failedSave), context),
    state,
  );
}
