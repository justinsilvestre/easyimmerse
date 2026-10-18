import type { FlashcardDraft } from "@easyimmerse/types";
import type { LookupPlace } from "./lookupPlace.ts";

/** How a screen makes flashcards from its words. */
export type WordFlashcards = {
  /** The draft of a flashcard for a word from its place, or null while the screen cannot make one yet. */
  draftFor: (word: string, place: LookupPlace | null) => FlashcardDraft | null;
  /** Whether a flashcard asked for from a word is saved at once, rather than opened in the form. */
  savesAtOnce: boolean;
};
