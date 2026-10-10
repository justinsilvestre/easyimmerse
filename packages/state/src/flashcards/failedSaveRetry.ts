import type { AppState } from "../app/appState.ts";
import { failedSaveIdOf, failedSavesOf, findFailedSave } from "./failedSave.ts";
import { askSave } from "./flashcardSaves.ts";
import { retryOf } from "./latestFlashcard.ts";

/**
 * Sends a failed save again, unless it was refused or its Retry is under way.
 * The failed save stays kept until the Retry lands, and an opening under way goes on, so that it still opens if the Retry fails.
 */
export function retryFailedSave(flashcardId: string, app: AppState) {
  const failedSave = findFailedSave(app, flashcardId);
  if (!failedSave || failedSave.isRefused || retryOf(app, flashcardId))
    return [];
  const { card, projectId, rollbackIfDiscarded } = failedSave;
  return askSave(
    { card, projectId, from: "retry", offersUndo: false, rollbackIfDiscarded },
    app,
    "background",
  );
}

/** Sends every failed save again, as `retryFailedSave` does. */
export function retryAllFailedSaves(app: AppState) {
  return failedSavesOf(app.operations).flatMap((failedSave) =>
    retryFailedSave(failedSaveIdOf(failedSave), app),
  );
}
