import type { AppState } from "../app/appState.ts";
import { failedSaveIdOf } from "./failedSave.ts";
import {
  selectFailedSave,
  selectFailedSaves,
  selectPendingRetry,
} from "./failedSaveSelectors.ts";
import { askSave } from "./flashcardSaves.ts";

/**
 * Sends a failed save again, unless it was refused or its Retry is under way.
 * The failed save stays kept until the Retry lands, and an opening under way goes on, so that it still opens if the Retry fails.
 */
export function retryFailedSave(flashcardId: string, app: AppState) {
  const failedSave = selectFailedSave(app, flashcardId);
  if (
    !failedSave ||
    failedSave.isRefused ||
    selectPendingRetry(app, flashcardId)
  )
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
  return selectFailedSaves(app).flatMap((failedSave) =>
    retryFailedSave(failedSaveIdOf(failedSave), app),
  );
}
