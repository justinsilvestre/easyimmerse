import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { flashcardNoticeKeys } from "../flashcardNotices.ts";
import { useUnsavedCards } from "../SharedSavingContext.tsx";

/**
 * Opens a listed card in the editor of its media file, going back to that screen if the user has left it.
 * The card stays listed, marked as opening, until that editor takes it; `useGiveUpOpenings` says what happens if it never does.
 * A refused save's own notice goes, since the card is on its way to the editor.
 */
export function useUnsavedCardOpening() {
  const store = useUnsavedCards();
  const dispatch = useAppDispatch();
  return (flashcardId: string) => {
    const listed = store.requestOpen(flashcardId);
    if (!listed?.mediaFileId) return;
    dispatch(
      actions.noticeWithdrawn(flashcardNoticeKeys.saveRefused(flashcardId)),
    );
    dispatch(
      actions.openMediaFileRequested(listed.projectId, listed.mediaFileId),
    );
  };
}
