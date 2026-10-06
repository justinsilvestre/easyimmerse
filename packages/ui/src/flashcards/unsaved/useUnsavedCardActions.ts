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

/** How long Open waits for the card's media screen to take it before telling that it could not be opened. */
export const unsavedCardOpenLimitMs = 10_000;

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
  /** Lists a card whose save failed with `error`. */
  function listFailure(
    card: EditedFlashcard,
    projectId: string,
    error: unknown,
  ) {
    const isRejected = isSaveRefused(error);
    const noticeId = isRejected ? showRefusal(card) : undefined;
    store.put(createUnsavedCard(card, projectId, { isRejected, noticeId }));
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
  /** Sends a listed card again. Returns whether anything was sent. */
  function resend(sent: UnsavedCard): boolean {
    const saving = queued.send(sent.card, sent.projectId);
    if (!saving) return false;
    queued.track(
      saving.then(
        () => settleRetry(sent),
        (error: unknown) => settleRetry(sent, { error }),
      ),
    );
    return true;
  }
  /**
   * Settles the listing of a retried card. A card taken into the editor meanwhile is left to the editor, which holds its edits;
   * a card whose listed edits changed meanwhile stays listed with them, even once the retry succeeds.
   */
  function settleRetry(sent: UnsavedCard, failure?: { error: unknown }) {
    const listed = store.find(sent.flashcardId);
    if (!listed) return;
    if (failure) return listFailure(listed.card, sent.projectId, failure.error);
    if (listed.card === sent.card) return unlistSaved(sent.card);
    store.put(createUnsavedCard(listed.card, sent.projectId));
  }
  /**
   * Opens the card in the editor of its media file, going back to that screen if the user has left it.
   * If the screen has not taken the card within `unsavedCardOpenLimitMs`, the card stays listed and a notice tells so.
   */
  function open(flashcardId: string) {
    const opening = store.requestOpen(flashcardId);
    const mediaFileId = opening?.listed.mediaFileId;
    if (!opening || !mediaFileId) return;
    const { listed, giveUp } = opening;
    dismissNoticeOf(listed);
    navigation.openMediaFile(listed.projectId, mediaFileId);
    setTimeout(() => {
      if (giveUp())
        notices.show(
          flashcardNotices.openFailed(listed.card.editor.content.word),
        );
    }, unsavedCardOpenLimitMs);
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
