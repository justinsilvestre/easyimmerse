import type { FlashcardFieldKind } from "@easyimmerse/types";

/** Every flashcard field kind, in the order fields appear on a card and in forms. */
export const flashcardFieldOrder: readonly FlashcardFieldKind[] = [
  "word",
  "word_pronunciation",
  "l1_definition",
  "l2_definition",
  "context",
  "context_translation",
  "context_pronunciation",
  "context_audio",
  "screenshot",
];
