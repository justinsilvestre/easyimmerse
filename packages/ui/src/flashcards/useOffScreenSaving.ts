import type { EditedFlashcard } from "./editedFlashcard.ts";
import { isSaveAsked } from "./saveStage.ts";
import { useUnsavedCardActions } from "./unsaved/useUnsavedCardActions.ts";
import { useClosedCardNotices } from "./useClosedCardNotices.ts";
import { useLateLookupSaves } from "./useLateLookupSaves.ts";
import { useQueuedSaving } from "./useQueuedSaving.ts";

/**
 * Saves the cards that leave a media screen's editor, through the app's save queue, for the project `projectId`.
 * A card saved without the user pressing Save gains an Undo notice, as `useSaveUndo` describes;
 * a failed save is listed, as `useUnsavedCardActions` describes; a card closed without saving gains the notice `useClosedCardNotices` describes.
 * `reopen` brings a card back to the editor.
 */
export function useOffScreenSaving(
  projectId: string,
  reopen: (card: EditedFlashcard) => void,
) {
  const queued = useQueuedSaving();
  const unsaved = useUnsavedCardActions();
  const closedCards = useClosedCardNotices(reopen);
  /** Saves a card that has left the editor, with an Undo notice when the user did not ask for the save. */
  const save = (card: EditedFlashcard) => {
    unsaved.saveInBackground(card, projectId, !isSaveAsked(card.stage));
  };
  const lateLookups = useLateLookupSaves(save);
  return {
    isScreenMounted: closedCards.isScreenMounted,
    withdrawUndo: queued.undo.withdraw,
    remove: queued.remove,
    replace: queued.replace,
    latestOf: queued.latestOf,
    track: queued.track,
    /**
     * Sends a card's save, or returns undefined when this opening's save is already under way.
     * Once it lands, the card leaves the list of unsaved flashcards, before any later work on it starts.
     */
    send: (card: EditedFlashcard) =>
      queued.send(card, projectId, () => unsaved.unlistSaved(card)),
    listFailure: (card: EditedFlashcard, error: unknown) =>
      unsaved.listFailure(card, projectId, error),
    save,
    saveAfterLookup: lateLookups.saveAfterLookup,
    rememberLookup: lateLookups.rememberLookup,
    showClosed: closedCards.showClosed,
    cleanUpAfterDiscard: (card: EditedFlashcard) =>
      queued.cleanUpAfterDiscard(card, projectId),
  };
}
