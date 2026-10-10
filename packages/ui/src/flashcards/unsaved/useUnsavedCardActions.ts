import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { type EditedFlashcard, flashcardIdOf } from "../editedFlashcard.ts";
import { flashcardNoticeKeys, flashcardNotices } from "../flashcardNotices.ts";
import { useUnsavedCards } from "../SharedSavingContext.tsx";
import { useQueuedSaving } from "../useQueuedSaving.ts";
import { isSaveRefused } from "./isSaveRefused.ts";
import { createUnsavedCard, mediaFileIdOf } from "./unsavedCard.ts";
import { useUnsavedCardOpening } from "./useUnsavedCardOpening.ts";
import { useUnsavedCardRetry } from "./useUnsavedCardRetry.ts";

/**
 * Saves cards that have left the editor, and keeps those whose save failed in the app's list of unsaved flashcards,
 * with what the user can do with them wherever they are shown: Retry, as `useUnsavedCardRetry` describes,
 * Open, as `useUnsavedCardOpening` describes, and Discard.
 * A save the server refused also gets a notice of its own, with Open and Discard, since sending it again cannot succeed.
 */
export function useUnsavedCardActions() {
  const store = useUnsavedCards();
  const queued = useQueuedSaving();
  const dispatch = useAppDispatch();
  const open = useUnsavedCardOpening();
  const retrying = useUnsavedCardRetry({ listFailure, unlistSaved });
  const withdrawRefusalOf = (flashcardId: string) =>
    dispatch(
      actions.noticeWithdrawn(flashcardNoticeKeys.saveRefused(flashcardId)),
    );
  /**
   * Sends a card that has left the editor to the project `projectId`, listing it if the save fails,
   * with an Undo notice once saved when `offersUndo`.
   */
  function saveInBackground(
    card: EditedFlashcard,
    projectId: string,
    offersUndo: boolean,
  ) {
    const before = queued.beforeOf(card);
    const saving = queued.send(card, projectId, () => unlistSaved(card));
    if (!saving) return;
    queued.track(
      saving.then(
        (saved) => {
          if (offersUndo) queued.undo.offer(card, saved, before);
        },
        (error: unknown) => listFailure(card, projectId, error),
      ),
    );
  }
  /** Lists a card whose save failed with `error`. */
  function listFailure(
    card: EditedFlashcard,
    projectId: string,
    error: unknown,
  ) {
    const isRejected = isSaveRefused(error);
    if (isRejected) showRefusal(card);
    else withdrawRefusalOf(flashcardIdOf(card));
    store.put(createUnsavedCard(card, projectId, { isRejected }));
  }
  /** Shows a notice of a refused save, with Open, for a card that has a media file to open in, and Discard. */
  function showRefusal(card: EditedFlashcard) {
    const flashcardId = flashcardIdOf(card);
    dispatch(
      actions.noticeRequested(
        flashcardNotices.saveRejected(flashcardId, card.editor.content.word, {
          open:
            mediaFileIdOf(card) === null ? undefined : () => open(flashcardId),
          discard: () => discard(flashcardId),
        }),
      ),
    );
  }
  /** Takes a card off the list once a save of it has succeeded. */
  function unlistSaved(card: EditedFlashcard) {
    const flashcardId = flashcardIdOf(card);
    if (store.remove(flashcardId)) withdrawRefusalOf(flashcardId);
  }
  /** Throws the card's edits away, with a brief Undo that lists the card again. Does nothing while a retry is under way. */
  function discard(flashcardId: string) {
    if (store.find(flashcardId)?.isRetrying) return;
    const listed = store.remove(flashcardId);
    if (!listed) return;
    withdrawRefusalOf(flashcardId);
    queued.cleanUpAfterDiscard(listed.card, listed.projectId);
    const { card, projectId, isRejected } = listed;
    dispatch(
      actions.noticeRequested(
        flashcardNotices.discarded(card.editor.content.word, () =>
          store.put(createUnsavedCard(card, projectId, { isRejected })),
        ),
      ),
    );
  }
  return {
    saveInBackground,
    listFailure,
    unlistSaved,
    ...retrying,
    open,
    discard,
  };
}
