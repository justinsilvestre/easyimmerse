import type { Flashcard } from "@easyimmerse/types";
import type { AnkiExportDialog } from "./ankiExportDialog.ts";

/** Tells whether the flashcard was never marked as exported. */
export const isUnexported = (flashcard: Flashcard) =>
  flashcard.exported_at_ms === null;

/** Tells whether the flashcard was edited after it was last marked as exported. */
export const isChangedSinceExport = ({
  exported_at_ms,
  updated_at_ms,
}: Flashcard) => exported_at_ms !== null && updated_at_ms > exported_at_ms;

/** Tells whether the flashcard is new or changed since it was last marked as exported. */
export const isNewOrChangedSinceExport = (flashcard: Flashcard) =>
  isUnexported(flashcard) || isChangedSinceExport(flashcard);

/** Tells whether AnkiConnect has no note for the flashcard yet. */
export const isUnsent = (flashcard: Flashcard) =>
  flashcard.anki_note_id === null;

/** Returns the flashcards in the order they were made, which is the order Anki shows them as new cards. */
export function oldestFirst(flashcards: readonly Flashcard[]): Flashcard[] {
  return [...flashcards].sort(
    (left, right) => left.created_at_ms - right.created_at_ms,
  );
}

/** Returns the flashcards made from the chosen media files, or every flashcard when none are chosen. */
export function flashcardsOfMedia(
  flashcards: readonly Flashcard[],
  mediaFileIds: readonly string[] | null,
): readonly Flashcard[] {
  if (mediaFileIds === null) return flashcards;
  return flashcards.filter(
    ({ media_file_id }) =>
      media_file_id !== null && mediaFileIds.includes(media_file_id),
  );
}

/** Returns the ids of the flashcards the dialog's choices export, oldest first. */
export function flashcardIdsToExport(
  flashcards: readonly Flashcard[],
  { scope, mediaFileIds }: Pick<AnkiExportDialog, "scope" | "mediaFileIds">,
): string[] {
  const chosen = flashcardsOfMedia(flashcards, mediaFileIds);
  const inScope =
    scope === "newAndChanged"
      ? chosen.filter(isNewOrChangedSinceExport)
      : chosen;
  return oldestFirst(inScope).map(({ id }) => id);
}
