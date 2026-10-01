import type { FlashcardFieldKind } from "@easyimmerse/types";

/** The order fields appear in on a card. Mirrors `canonical_field_order` in crates/core/src/flashcard.rs. */
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
