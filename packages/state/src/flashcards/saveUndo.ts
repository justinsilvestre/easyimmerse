import type { FlashcardDraft } from "@easyimmerse/types";

/** What the Undo of a save needs: the flashcard, its word for the notices, and what it held before the save, or null for a new flashcard. */
export type SaveUndo = {
  projectId: string;
  flashcardId: string;
  word: string;
  before: FlashcardDraft | null;
};
