import { actions } from "@easyimmerse/state";
import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import type { EditedFlashcard } from "./editedFlashcard.ts";
import { flashcardNoticeKeys, flashcardNotices } from "./flashcardNotices.ts";
import { useSharedSaving } from "./SharedSavingContext.tsx";
import { useFlashcardRequests } from "./useFlashcardRequests.ts";
import { useUnsavedWorkTracking } from "./useUnsavedWorkTracking.ts";

/**
 * Offers Undo of flashcard saves the user did not ask for. Only a flashcard's latest save can be undone:
 * its Undo is withdrawn once a later save of the flashcard starts, or the flashcard opens in the editor.
 * An Undo is sent through the app's save queue, after any earlier work on the flashcard.
 */
export function useSaveUndo() {
  const { queue } = useSharedSaving();
  const dispatch = useAppDispatch();
  const requestsFor = useFlashcardRequests();
  const { track } = useUnsavedWorkTracking();
  return {
    withdraw: (flashcardId: string) =>
      dispatch(
        actions.noticeWithdrawn(flashcardNoticeKeys.saveUndo(flashcardId)),
      ),
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
        const undoing = queue.addFor(
          saved.id,
          () => requestsFor(saved.project_id).undoSave(card, saved, before),
          before ?? undefined,
        );
        track(undoing).catch(() =>
          dispatch(actions.noticeRequested(flashcardNotices.undoFailed(word))),
        );
      };
      dispatch(
        actions.noticeRequested(
          flashcardNotices.savedWithUndo(saved.id, word, undo),
        ),
      );
    },
  };
}
