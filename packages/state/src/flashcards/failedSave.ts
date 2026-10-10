import type { AppState } from "../app/appState.ts";
import type { FailedRequest } from "../operations/failedRequests.ts";
import type { OperationsState } from "../operations/operations.ts";
import { isOpeningInFlight } from "./failedSaveOpeningRequests.ts";
import type { FlashcardCard } from "./flashcardCard.ts";
import { flashcardIdOf, mediaFileIdOf } from "./flashcardCard.ts";
import type { Rollback } from "./flashcardForm.ts";
import { isSaveRefused } from "./isSaveRefused.ts";

/**
 * A card that left the form and whose background save failed, read from the save request kept for it,
 * until the user retries, opens or discards it.
 */
export type FailedSave = {
  card: FlashcardCard;
  projectId: string;
  /** The media file whose form edits the card, or null when it has none, in which case it has no Open. */
  mediaFileId: string | null;
  /** Whether the server refused the save, so that only Open and Discard are offered. */
  isRefused: boolean;
  /** Whether the user pressed Open and the requests on the way to its form are under way. */
  isOpening: boolean;
  rollbackIfDiscarded: Rollback | null;
  /** The kept request it is read from: the save a Retry sends, and how the last save failed. */
  kept: FailedRequest;
};

const keptIdPrefix = "flashcards/failedSave/";

/** The id under which the failed save of a flashcard is kept. */
export function failedSaveKeptId(flashcardId: string): string {
  return `${keptIdPrefix}${flashcardId}`;
}

/** The failed saves, in the order they were first kept. */
export function failedSavesOf(operations: OperationsState): FailedSave[] {
  return operations.failedRequests.flatMap((kept) => {
    const failedSave = failedSaveOf(kept, operations);
    return failedSave ? [failedSave] : [];
  });
}

/** The failed save of a flashcard, if there is one. */
export function findFailedSave(
  app: AppState,
  flashcardId: string,
): FailedSave | undefined {
  const id = failedSaveKeptId(flashcardId);
  const kept = app.operations.failedRequests.find((each) => each.id === id);
  return (kept && failedSaveOf(kept, app.operations)) ?? undefined;
}

/** The id of the flashcard a failed save would create or replace. */
export function failedSaveIdOf(failedSave: FailedSave): string {
  return flashcardIdOf(failedSave.card);
}

/** Reads a failed save from a kept request, or null when the request is not a kept card save. */
export function failedSaveOf(
  kept: FailedRequest,
  operations: OperationsState,
): FailedSave | null {
  const { request, failure } = kept;
  if (!kept.id.startsWith(keptIdPrefix) || request.kind !== "saveFlashcard")
    return null;
  if (request.purpose.type !== "save") return null;
  const { card, rollbackIfDiscarded } = request.purpose;
  return {
    card,
    projectId: request.projectId,
    mediaFileId: mediaFileIdOf(card),
    isRefused: isSaveRefused(failure),
    isOpening: isOpeningInFlight(operations, request.flashcardId),
    rollbackIfDiscarded,
    kept,
  };
}
