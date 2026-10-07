import type { NoticeContent } from "../notices/noticeStore.ts";

/** The notices a flashcard's save or discard leaves behind once the card has left the editor. */
export const flashcardNotices = {
  /** A card was saved; Undo takes the save back. A card may have no word yet, as one made from a subtitle alone. */
  savedWithUndo: (word: string, undo: () => void): NoticeContent => ({
    tone: "success",
    message: word
      ? `Saved the flashcard for “${word}”.`
      : "Saved a flashcard without a word.",
    actions: [{ label: "Undo", onSelect: undo }],
    isTransient: true,
  }),
  /**
   * The server refused a card's save, so that sending it again cannot succeed. The card stays in the list of unsaved flashcards;
   * dismissing the notice only hides it. A card without a media file has no editor to open in, so it has no Open.
   */
  saveRejected: (
    word: string,
    { open, discard }: { open?: () => void; discard: () => void },
  ): NoticeContent => ({
    tone: "danger",
    message: `The server refused the flashcard for “${word}”.`,
    actions: [
      ...(open ? [{ label: "Open", onSelect: open }] : []),
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
  /** A card the user chose to open from the list of unsaved flashcards did not reach its editor, and stays listed. */
  openFailed: (word: string): NoticeContent => ({
    tone: "danger",
    message: `Couldn't open the flashcard for “${word}”. It is still listed among the flashcards not saved.`,
    isTransient: false,
  }),
  undoFailed: (word: string): NoticeContent => ({
    tone: "danger",
    message: `Couldn't undo the save of the flashcard for “${word}”.`,
    isTransient: false,
  }),
};
