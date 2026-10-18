import type { FlashcardSync } from "./selectFlashcardSync.ts";

/**
 * What the project overview's flashcards panel puts first:
 * the choice among the ways to use the flashcards, while none is in use yet,
 * AnkiConnect, while it is on for the project,
 * or the Anki deck package, once flashcards have reached Anki while AnkiConnect is off.
 */
export type ProjectFlashcardsMode = "fresh" | "ankiConnect" | "package";

/** Tells which way to use the project's flashcards is in use, from what the flashcards panel shows about each. */
export function projectFlashcardsModeOf({
  ankiConnect,
  queue,
  package: packageSync,
}: FlashcardSync): ProjectFlashcardsMode {
  if (ankiConnect !== null) return "ankiConnect";
  // A deleted flashcard can have reached Anki while no remaining one has, and its listed deletion keeps the package in use.
  if (queue.hasBeenFlushed || packageSync.deletions.length > 0)
    return "package";
  return "fresh";
}
