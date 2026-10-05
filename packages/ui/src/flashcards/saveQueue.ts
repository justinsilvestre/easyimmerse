import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import type { CardSession, EditedFlashcard } from "./editedFlashcard.ts";
import { draftOfEdited, withDraft } from "./flashcardDrafts.ts";

/**
 * Orders the saves of flashcards. One opening of a card is saved at most once at a time, however the editor and its going away overlap;
 * work on the same flashcard, such as two openings' saves or a save and its Undo, is sent one after the other,
 * so that the later work lands last.
 * The queue also knows a flashcard's content before the list of flashcards does: the draft last sent while work on it is under way,
 * and afterwards the flashcard that work returned, until the list has caught up.
 */
export function createSaveQueue() {
  const inFlight = new Set<CardSession>();
  const lastByFlashcard = new Map<string, Promise<unknown>>();
  const latestDrafts = new Map<string, FlashcardDraft>();
  const returnedFlashcards = new Map<string, Flashcard>();
  const successListeners = new Set<(flashcardId: string) => void>();
  const noteSuccess = (flashcardId: string, result: unknown) => {
    if (isFlashcard(result, flashcardId))
      returnedFlashcards.set(flashcardId, result);
    else returnedFlashcards.delete(flashcardId);
    for (const listener of successListeners) listener(flashcardId);
  };
  /** Sends `send` once any earlier work on the flashcard has settled. */
  const enqueue = <T>(
    flashcardId: string,
    send: () => Promise<T>,
    draft: FlashcardDraft | undefined,
  ) => {
    if (draft) latestDrafts.set(flashcardId, draft);
    const earlier = lastByFlashcard.get(flashcardId) ?? Promise.resolve();
    const settled = earlier
      .catch(() => undefined)
      .then(send)
      .then((result) => {
        noteSuccess(flashcardId, result);
        return result;
      });
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
    /** The flashcard as the latest work on it left it, which the list of flashcards, holding `listed`, may not show yet. */
    latestOf(listed: Flashcard): Flashcard {
      const draft = latestDrafts.get(listed.id);
      const returned = returnedFlashcards.get(listed.id);
      const isReturnedNewer =
        returned !== undefined && returned.updated_at_ms > listed.updated_at_ms;
      if (!isReturnedNewer) returnedFlashcards.delete(listed.id);
      const known = isReturnedNewer ? returned : listed;
      return draft ? withDraft(known, draft) : known;
    },
    /** Calls `listener` with a flashcard's id whenever work on that flashcard succeeds, until the returned function is called. */
    onSuccess(listener: (flashcardId: string) => void) {
      successListeners.add(listener);
      return () => {
        successListeners.delete(listener);
      };
    },
  };
}

function isFlashcard(result: unknown, id: string): result is Flashcard {
  return (
    typeof result === "object" &&
    result !== null &&
    (result as Partial<Flashcard>).id === id &&
    "updated_at_ms" in result
  );
}
