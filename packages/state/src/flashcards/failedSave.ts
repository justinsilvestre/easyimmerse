import type { FailedRequest } from "../operations/failedRequests.ts";
import type { FlashcardCard } from "./flashcardCard.ts";
import { flashcardIdOf } from "./flashcardCard.ts";
import type { Rollback } from "./flashcardForm.ts";

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

/** Tells whether a kept request's id is one under which a failed save is kept. */
export function isFailedSaveKeptId(id: string): boolean {
  return id.startsWith(keptIdPrefix);
}

/** The id of the flashcard a failed save would create or replace. */
export function failedSaveIdOf(failedSave: FailedSave): string {
  return flashcardIdOf(failedSave.card);
}
