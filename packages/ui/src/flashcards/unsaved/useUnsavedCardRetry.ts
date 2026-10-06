import type { EditedFlashcard } from "../editedFlashcard.ts";
import { useUnsavedCards } from "../SharedSavingContext.tsx";
import { useQueuedSaving } from "../useQueuedSaving.ts";
import { createUnsavedCard, type UnsavedCard } from "./unsavedCard.ts";

/** What becomes of the listing of a card once its save has settled. */
type Listing = {
  /** Lists a card whose save failed with `error`. */
  listFailure: (
    card: EditedFlashcard,
    projectId: string,
    error: unknown,
  ) => void;
  /** Takes a card off the list once a save of it has succeeded. */
  unlistSaved: (card: EditedFlashcard) => void;
};

/**
 * Sends listed cards again when the user asks, marking each as being saved while its retry is under way.
 * A card taken into the editor during its retry is left to the editor, which holds its edits;
 * a card whose listed edits changed during its retry stays listed with them, even once the retry succeeds.
 */
export function useUnsavedCardRetry({ listFailure, unlistSaved }: Listing) {
  const store = useUnsavedCards();
  const queued = useQueuedSaving();
  function settle(sent: UnsavedCard, failure?: { error: unknown }) {
    const listed = store.find(sent.flashcardId);
    if (!listed) return;
    if (failure) return listFailure(listed.card, sent.projectId, failure.error);
    if (listed.card === sent.card) return unlistSaved(sent.card);
    store.put(createUnsavedCard(listed.card, sent.projectId));
  }
  /** Sends a listed card again, and tells whether anything was sent. */
  function resend(sent: UnsavedCard): boolean {
    const saving = queued.send(sent.card, sent.projectId);
    if (!saving) return false;
    queued.track(
      saving.then(
        () => settle(sent),
        (error: unknown) => settle(sent, { error }),
      ),
    );
    return true;
  }
  return {
    retry: (flashcardId: string) => store.retry(flashcardId, resend),
    retryAll: () => store.retryAll(resend),
  };
}
