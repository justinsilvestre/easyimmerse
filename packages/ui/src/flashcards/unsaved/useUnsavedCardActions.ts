import { useNavigationActions } from "../../navigationContext.ts";
import { useNotices } from "../../notices/NoticesContext.tsx";
import { type EditedFlashcard, flashcardIdOf } from "../editedFlashcard.ts";
import { flashcardNotices } from "../flashcardNotices.ts";
import { useUnsavedCards } from "../SharedSavingContext.tsx";
import { useQueuedSaving } from "../useQueuedSaving.ts";
import { isSaveRefused } from "./isSaveRefused.ts";
import {
  createUnsavedCard,
  mediaFileIdOf,
  type UnsavedCard,
} from "./unsavedCard.ts";

/**
 * Saves cards that have left the editor, and keeps those whose save failed in the app's list of unsaved flashcards,
 * with what the user can do with them wherever they are shown: Retry, Open and Discard.
 * A save the server refused also gets a notice of its own, with Open and Discard, since sending it again cannot succeed.
 */
export function useUnsavedCardActions() {
  const store = useUnsavedCards();
  const queued = useQueuedSaving();
  const notices = useNotices();
  const navigation = useNavigationActions();
  const dismissNoticeOf = (listed: UnsavedCard | undefined) => {
    if (listed?.noticeId !== undefined) notices.dismiss(listed.noticeId);
  };
  /**
   * Sends a card that has left the editor to the project `projectId`, listing it if the save fails,
   * with an Undo notice once saved when `offersUndo`. Returns whether anything was sent.
   */
  function saveInBackground(
    card: EditedFlashcard,
    projectId: string,
    offersUndo: boolean,
  ): boolean {
    const before = queued.beforeOf(card);
    const saving = queued.send(card, projectId);
    if (!saving) return false;
    queued.track(
      saving.then(
        (saved) => {
          unlistSaved(card);
          if (offersUndo) queued.undo.offer(card, saved, before);
        },
        (error: unknown) => listFailure(card, projectId, error),
      ),
    );
    return true;
  }
  /** Lists a card whose save failed with `error`, keeping any edits its listed copy gained while that save was a retry. */
  function listFailure(
    card: EditedFlashcard,
    projectId: string,
    error: unknown,
  ) {
    const flashcardId = flashcardIdOf(card);
    const retried = store.find(flashcardId);
    const latest = retried?.isRetrying ? retried.card : card;
    const isRejected = isSaveRefused(error);
    const noticeId = isRejected ? showRefusal(latest) : undefined;
    store.put(createUnsavedCard(latest, projectId, { isRejected, noticeId }));
  }
  /** Shows a notice of a refused save, with Open, for a card that has a media file to open in, and Discard. */
  function showRefusal(card: EditedFlashcard) {
    const flashcardId = flashcardIdOf(card);
    return notices.show(
      flashcardNotices.saveRejected(card.editor.content.word, {
        open:
          mediaFileIdOf(card) === null ? undefined : () => open(flashcardId),
        discard: () => discard(flashcardId),
      }),
    );
  }
  /** Takes a card off the list once a save of it has succeeded. */
  function unlistSaved(card: EditedFlashcard) {
    dismissNoticeOf(store.remove(flashcardIdOf(card)));
  }
  const resend = (listed: UnsavedCard) =>
    saveInBackground(listed.card, listed.projectId, false);
  /** Opens the card in the editor of its media file, going back to that screen if the user has left it. */
  function open(flashcardId: string) {
    const listed = store.requestOpen(flashcardId);
    if (!listed?.mediaFileId) return;
    dismissNoticeOf(listed);
    navigation.openMediaFile(listed.projectId, listed.mediaFileId);
  }
  /** Throws the card's edits away, with a brief Undo that lists the card again. Does nothing while a retry is under way. */
  function discard(flashcardId: string) {
    if (store.find(flashcardId)?.isRetrying) return;
    const listed = store.remove(flashcardId);
    if (!listed) return;
    dismissNoticeOf(listed);
    queued.cleanUpAfterDiscard(listed.card, listed.projectId);
    const { card, projectId, isRejected } = listed;
    notices.show(
      flashcardNotices.discarded(card.editor.content.word, () =>
        store.put(createUnsavedCard(card, projectId, { isRejected })),
      ),
    );
  }
  return {
    saveInBackground,
    listFailure,
    unlistSaved,
    retry: (flashcardId: string) => store.retry(flashcardId, resend),
    retryAll: () => store.retryAll(resend),
    open,
    discard,
  };
}
