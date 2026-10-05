import type { FlashcardDraft } from "@easyimmerse/types";
import type { CardSession, EditedFlashcard } from "./editedFlashcard.ts";
import { draftOfEdited } from "./flashcardDrafts.ts";

/**
 * Orders the saves of flashcards. One opening of a card is saved at most once at a time, however the editor and its going away overlap;
 * work on the same flashcard, such as two openings' saves or a save and its Undo, is sent one after the other,
 * so that the later work lands last. While work on a flashcard is under way, the queue keeps the draft last sent for it,
 * which the list of flashcards may not show yet.
 */
export function createSaveQueue() {
  const inFlight = new Set<CardSession>();
  const lastByFlashcard = new Map<string, Promise<unknown>>();
  const latestDrafts = new Map<string, FlashcardDraft>();
  /** Sends `send` once any earlier work on the flashcard has settled. */
  const enqueue = <T>(
    flashcardId: string,
    send: () => Promise<T>,
    draft: FlashcardDraft | undefined,
  ) => {
    if (draft) latestDrafts.set(flashcardId, draft);
    const earlier = lastByFlashcard.get(flashcardId) ?? Promise.resolve();
    const settled = earlier.catch(() => undefined).then(send);
    lastByFlashcard.set(flashcardId, settled);
    settled
      .catch(() => undefined)
      .then(() => {
        if (lastByFlashcard.get(flashcardId) !== settled) return;
        lastByFlashcard.delete(flashcardId);
        latestDrafts.delete(flashcardId);
      });
    return settled;
  };
  return {
    /**
     * Sends a card's save after any earlier work on the same flashcard has settled.
     * Returns the save's outcome, or undefined when this opening's save is already under way.
     */
    add<T>(
      card: EditedFlashcard,
      send: () => Promise<T>,
    ): Promise<T> | undefined {
      if (inFlight.has(card.session)) return undefined;
      inFlight.add(card.session);
      const flashcardId =
        card.kind === "existing" ? card.flashcard.id : card.flashcardId;
      return enqueue(flashcardId, send, draftOfEdited(card)).finally(() =>
        inFlight.delete(card.session),
      );
    },
    /** Sends other work on a flashcard, such as an Undo, after any earlier work on it has settled. `draft` is what it sends, if anything. */
    addFor<T>(
      flashcardId: string,
      send: () => Promise<T>,
      draft?: FlashcardDraft,
    ): Promise<T> {
      return enqueue(flashcardId, send, draft);
    },
    /** The draft last sent for a flashcard, while work on it is under way. */
    latest: (flashcardId: string) => latestDrafts.get(flashcardId),
  };
}
