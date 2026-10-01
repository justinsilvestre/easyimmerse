import type { FlashcardFieldKind } from "@easyimmerse/types";

/** The label of each flashcard field as the forms show it. */
export const flashcardFieldLabels: Record<FlashcardFieldKind, string> = {
  word: "Word",
  word_pronunciation: "Word pronunciation",
  l1_definition: "Definition in your language",
  l2_definition: "Definition in the target language",
  context: "Sentence",
  context_translation: "Sentence translation",
  context_pronunciation: "Sentence pronunciation",
  context_audio: "Sentence audio",
  screenshot: "Screenshot",
};
