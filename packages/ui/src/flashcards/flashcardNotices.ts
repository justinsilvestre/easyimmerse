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
   * A save off screen failed; the card's edits wait in the notice until it is retried or, while the editor is there, reopened.
   * Dismissing the notice discards them.
   */
  saveFailed: (
    word: string,
    retry: () => void,
    discard: () => void,
    reopen?: () => void,
  ): NoticeContent => ({
    tone: "danger",
    message: `Couldn't save the flashcard for “${word}”.`,
    actions: [
      { label: "Retry", onSelect: retry },
      ...(reopen ? [{ label: "Reopen", onSelect: reopen }] : []),
    ],
    isTransient: false,
    onDismiss: discard,
  }),
  /** A changed card was closed without saving, or its failure notice dismissed; Undo brings its edits back. */
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
