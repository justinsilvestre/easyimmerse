import type { CardSession, EditedFlashcard } from "./editedFlashcard.ts";

/**
 * Orders the saves of flashcards. One opening of a card is saved at most once at a time, however the editor and its going away overlap;
 * work on the same saved flashcard, such as two openings' saves or a save and its Undo, is sent one after the other,
 * so that the later work lands last.
 */
export function createSaveQueue() {
  const inFlight = new Set<CardSession>();
  const lastByFlashcard = new Map<string, Promise<unknown>>();
  /** Sends `send` once any earlier work on the flashcard has settled; with no flashcard id, sends it right away. */
  const enqueue = <T>(flashcardId: string | null, send: () => Promise<T>) => {
    if (flashcardId === null) return Promise.resolve().then(send);
    const earlier = lastByFlashcard.get(flashcardId) ?? Promise.resolve();
    const settled = earlier.catch(() => undefined).then(send);
    lastByFlashcard.set(flashcardId, settled);
    settled
      .catch(() => undefined)
      .then(() => {
        if (lastByFlashcard.get(flashcardId) === settled)
          lastByFlashcard.delete(flashcardId);
      });
    return settled;
  };
  return {
    /**
     * Sends a card's save after any earlier work on the same saved flashcard has settled.
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
      return enqueue(flashcardId, send).finally(() =>
        inFlight.delete(card.session),
      );
    },
    /** Sends other work on a saved flashcard, such as an Undo, after any earlier work on it has settled. */
    addFor<T>(flashcardId: string, send: () => Promise<T>): Promise<T> {
      return enqueue(flashcardId, send);
    },
  };
}
