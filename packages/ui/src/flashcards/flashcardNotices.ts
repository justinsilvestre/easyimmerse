import type { NoticeContent } from "../notices/noticeStore.ts";

/** The notices a flashcard's save or discard leaves behind once the card has left the editor. */
export const flashcardNotices = {
  /** A card left for another, or by leaving the screen, was saved; Undo takes the save back. */
  savedWithUndo: (word: string, undo: () => void): NoticeContent => ({
    tone: "success",
    message: `Saved the flashcard for “${word}”.`,
    actions: [{ label: "Undo", onSelect: undo }],
    isTransient: true,
  }),
  /**
   * The server refused a card's save, so that sending it again cannot succeed. The card stays in the list of unsaved flashcards;
   * dismissing the notice only hides it.
   */
  saveRejected: (
    word: string,
    { open, discard }: { open: () => void; discard: () => void },
  ): NoticeContent => ({
    tone: "danger",
    message: `The server refused the flashcard for “${word}”.`,
    actions: [
      { label: "Open", onSelect: open },
      { label: "Discard", onSelect: discard },
    ],
    isTransient: false,
  }),
  /** A changed card was closed without saving, or an unsaved one discarded; Undo brings its edits back. */
  discarded: (word: string, undo: () => void): NoticeContent => ({
    tone: "info",
    message: `Discarded your changes to the flashcard for “${word}”.`,
    actions: [{ label: "Undo", onSelect: undo }],
    isTransient: true,
  }),
  undoFailed: (word: string): NoticeContent => ({
    tone: "danger",
    message: `Couldn't undo the save of the flashcard for “${word}”.`,
    isTransient: false,
  }),
};
