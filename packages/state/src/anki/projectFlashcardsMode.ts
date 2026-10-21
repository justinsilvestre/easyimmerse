import type { FlashcardSync } from "./selectFlashcardSync.ts";

/**
 * What the project overview's flashcards panel puts first:
 * the choice among the ways to use the flashcards, while none is in use yet,
 * AnkiConnect, while it is on for the project or once flashcards have been sent through it,
 * the review in easyImmerse, once it has progress and AnkiConnect is not in use,
 * or the Anki deck package, once flashcards have been exported in one and never sent through AnkiConnect.
 */
export type ProjectFlashcardsMode =
  | "fresh"
  | "ankiConnect"
  | "review"
  | "package";

/** Tells which way to use the project's flashcards is in use, from what the flashcards panel shows about each. */
export function projectFlashcardsModeOf({
  ankiConnect,
  queue,
  package: packageSync,
  review,
}: FlashcardSync): ProjectFlashcardsMode {
  if (ankiConnect.isOn || queue.hasBeenSent) return "ankiConnect";
  if (review.hasProgress) return "review";
  // A deleted flashcard can have reached Anki while no remaining one has, and its listed deletion keeps the package in use.
  if (queue.hasBeenExported || packageSync.deletions.length > 0)
    return "package";
  return "fresh";
}
