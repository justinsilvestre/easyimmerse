import type { Flashcard } from "@easyimmerse/types";
import { useState } from "react";
import { useNotices } from "../notices/NoticesContext.tsx";
import type { EditedFlashcard } from "./editedFlashcard.ts";
import { flashcardNotices } from "./flashcardNotices.ts";
import type { createSaveQueue } from "./saveQueue.ts";
import type { useFlashcardRequests } from "./useFlashcardRequests.ts";
import { useUnsavedWorkTracking } from "./useUnsavedWorkTracking.ts";

/**
 * Offers Undo of flashcard saves the user did not ask for. Only a flashcard's latest save can be undone:
 * its Undo is withdrawn once a later save of the flashcard starts, or the flashcard opens in the editor.
 * An Undo is sent through `queue`, after any earlier work on the flashcard.
 */
export function useSaveUndo(
  queue: ReturnType<typeof createSaveQueue>,
  requests: ReturnType<typeof useFlashcardRequests>,
) {
  const notices = useNotices();
  const track = useUnsavedWorkTracking();
  /** The notice offering Undo of each flashcard's latest save, by flashcard id. */
  const [undoNotices] = useState(() => new Map<string, number>());
  const withdraw = (flashcardId: string) => {
    const id = undoNotices.get(flashcardId);
    if (id === undefined) return;
    undoNotices.delete(flashcardId);
    notices.dismiss(id);
  };
  return {
    withdraw,
    /** Shows that `card` was saved as `saved`, with an Undo that takes the save back. */
    offer: (card: EditedFlashcard, saved: Flashcard) => {
      const word = card.editor.content.word;
      const undo = () => {
        undoNotices.delete(saved.id);
        const undoing = queue.addFor(saved.id, () =>
          requests.undoSave(card, saved),
        );
        track(undoing).catch(() =>
          notices.show(flashcardNotices.undoFailed(word)),
        );
      };
      withdraw(saved.id);
      undoNotices.set(
        saved.id,
        notices.show(flashcardNotices.savedWithUndo(word, undo)),
      );
    },
  };
}
