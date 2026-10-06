import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { useNotices } from "../notices/NoticesContext.tsx";
import type { EditedFlashcard } from "./editedFlashcard.ts";
import { flashcardNotices } from "./flashcardNotices.ts";
import { useSharedSaving } from "./SharedSavingContext.tsx";
import { useFlashcardRequests } from "./useFlashcardRequests.ts";
import { useUnsavedWorkTracking } from "./useUnsavedWorkTracking.ts";

/**
 * Offers Undo of flashcard saves the user did not ask for. Only a flashcard's latest save can be undone:
 * its Undo is withdrawn once a later save of the flashcard starts, or the flashcard opens in the editor.
 * An Undo is sent through the app's save queue, after any earlier work on the flashcard.
 */
export function useSaveUndo() {
  const { queue, undoNotices } = useSharedSaving();
  const notices = useNotices();
  const requestsFor = useFlashcardRequests();
  const { track } = useUnsavedWorkTracking();
  const withdraw = (flashcardId: string) => {
    const id = undoNotices.get(flashcardId);
    if (id === undefined) return;
    undoNotices.delete(flashcardId);
    notices.dismiss(id);
  };
  return {
    withdraw,
    /**
     * Shows that `card` was saved as `saved`, with an Undo that takes the save back:
     * it deletes a new card, or puts back `before`, what a saved card held before the save.
     */
    offer: (
      card: EditedFlashcard,
      saved: Flashcard,
      before: FlashcardDraft | null,
    ) => {
      const word = card.editor.content.word;
      const undo = () => {
        undoNotices.delete(saved.id);
        const undoing = queue.addFor(
          saved.id,
          () => requestsFor(saved.project_id).undoSave(card, saved, before),
          before ?? undefined,
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
