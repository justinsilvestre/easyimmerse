import { useNavigationActions } from "../../navigationContext.ts";
import { useNotices } from "../../notices/NoticesContext.tsx";
import { flashcardNotices } from "../flashcardNotices.ts";
import { useUnsavedCards } from "./UnsavedCardsContext.tsx";

/** What the user can do with a flashcard that could not be saved, wherever it is shown. */
export function useUnsavedCardActions() {
  const store = useUnsavedCards();
  const notices = useNotices();
  const navigation = useNavigationActions();
  const dismissNoticeOf = (noticeId: number | undefined) => {
    if (noticeId !== undefined) notices.dismiss(noticeId);
  };
  return {
    retry: store.retry,
    retryAll: store.retryAll,
    /** Opens the card in the editor of its media file, going back to that screen if the user has left it. */
    open(flashcardId: string) {
      const listed = store.requestOpen(flashcardId);
      if (!listed?.mediaFileId) return;
      dismissNoticeOf(listed.noticeId);
      navigation.openMediaFile(listed.projectId, listed.mediaFileId);
    },
    /** Throws the card's edits away, with a brief Undo that lists the card again. */
    discard(flashcardId: string) {
      const listed = store.remove(flashcardId);
      if (!listed) return;
      dismissNoticeOf(listed.noticeId);
      listed.discard();
      const { noticeId: _, ...card } = listed;
      notices.show(
        flashcardNotices.discarded(listed.card.editor.content.word, () =>
          store.put(card),
        ),
      );
    },
  };
}
