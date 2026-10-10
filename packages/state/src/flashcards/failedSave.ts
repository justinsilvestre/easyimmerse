import type { FlashcardCard } from "./flashcardCard.ts";
import { flashcardIdOf, mediaFileIdOf } from "./flashcardCard.ts";
import type { Rollback } from "./flashcardForm.ts";

/** A card that left the form and whose background save failed, kept with its edits until the user retries, opens or discards it. */
export type FailedSave = {
  card: FlashcardCard;
  projectId: string;
  /** The media file whose form edits the card, or null when it has none, in which case it has no Open. */
  mediaFileId: string | null;
  /** Whether the server refused the save, so that only Open and Discard are offered. */
  isRefused: boolean;
  /** Whether the user pressed Open, so that the card waits to be taken by its media file's form. */
  isOpening: boolean;
  rollbackIfDiscarded: Rollback | null;
};

/** Describes a card of the project `projectId` whose save failed, as the status line lists it. */
export function createFailedSave(
  card: FlashcardCard,
  projectId: string,
  isRefused: boolean,
  rollbackIfDiscarded: Rollback | null,
): FailedSave {
  return {
    card,
    projectId,
    mediaFileId: mediaFileIdOf(card),
    isRefused,
    isOpening: false,
    rollbackIfDiscarded,
  };
}

/** The id of the flashcard a failed save would create or replace. */
export function failedSaveIdOf(failedSave: FailedSave): string {
  return flashcardIdOf(failedSave.card);
}
