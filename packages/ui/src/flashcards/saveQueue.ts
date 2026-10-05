import type { CardSession, EditedFlashcard } from "./editedFlashcard.ts";

/**
 * Orders the saves of flashcards. One opening of a card is saved at most once at a time, however the editor and its going away overlap;
 * two openings of the same saved flashcard are saved one after the other, so that the later save lands last.
 */
export function createSaveQueue() {
  const inFlight = new Set<CardSession>();
  const lastByFlashcard = new Map<string, Promise<unknown>>();
  return {
    /**
     * Sends a card's save after any earlier save of the same saved flashcard has settled.
     * Returns the save's outcome, or undefined when this opening's save is already under way.
     */
    add<T>(
      card: EditedFlashcard,
      send: () => Promise<T>,
    ): Promise<T> | undefined {
      if (inFlight.has(card.session)) return undefined;
      inFlight.add(card.session);
      const key = card.kind === "existing" ? card.flashcard.id : null;
      const earlier =
        (key === null ? undefined : lastByFlashcard.get(key)) ??
        Promise.resolve();
      const saving = earlier.catch(() => undefined).then(send);
      const settled = saving.finally(() => inFlight.delete(card.session));
      if (key !== null) {
        lastByFlashcard.set(key, settled);
        settled
          .catch(() => undefined)
          .then(() => {
            if (lastByFlashcard.get(key) === settled)
              lastByFlashcard.delete(key);
          });
      }
      return settled;
    },
  };
}
