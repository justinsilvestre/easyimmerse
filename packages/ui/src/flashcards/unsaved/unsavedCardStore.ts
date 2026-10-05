import type { EditedFlashcard } from "../editedFlashcard.ts";

/** A card that left the editor and could not be saved, with its edits. */
export type UnsavedCard = {
  /** The id the flashcard has, or will be created under. */
  flashcardId: string;
  card: EditedFlashcard;
  projectId: string;
  /** The media file whose screen edits the card, or null when the card has none. */
  mediaFileId: string | null;
  /** Whether the server refused the save, so that sending it again cannot succeed. */
  isRejected: boolean;
  /** Sends the card again. */
  retry: () => void;
  /** Takes back whatever a save of the card may have left on the server, once the user discards it. */
  discard: () => void;
  /** The notice that tells of the card on its own, as a rejected save has, which goes once the card leaves the list. */
  noticeId?: number;
};

export type ListedUnsavedCard = UnsavedCard & {
  /** Whether a retry the user asked for is under way. */
  isRetrying: boolean;
};

/**
 * Keeps the cards that could not be saved until the user retries, opens or discards them.
 * Each listed card counts as unsaved work, through `onHeld` and `onReleased`, so that the app warns before closing.
 * Retrying happens only when asked for.
 */
export function createUnsavedCardStore({
  onHeld = () => undefined,
  onReleased = () => undefined,
}: {
  onHeld?: () => void;
  onReleased?: () => void;
} = {}) {
  let cards: readonly ListedUnsavedCard[] = [];
  let opening: UnsavedCard | null = null;
  const listeners = new Set<() => void>();
  const set = (next: readonly ListedUnsavedCard[]) => {
    cards = next;
    for (const listener of listeners) listener();
  };
  const find = (flashcardId: string) =>
    cards.find((listed) => listed.flashcardId === flashcardId);
  const remove = (flashcardId: string) => {
    const listed = find(flashcardId);
    if (!listed) return undefined;
    set(cards.filter((other) => other !== listed));
    onReleased();
    return listed;
  };
  const retry = (flashcardId: string) => {
    const listed = find(flashcardId);
    if (!listed || listed.isRejected) return;
    set(
      cards.map((other) =>
        other === listed ? { ...listed, isRetrying: true } : other,
      ),
    );
    listed.retry();
  };
  return {
    list: () => cards,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Lists a card, in place of any listed under the same flashcard id. */
    put(card: UnsavedCard) {
      const listed = { ...card, isRetrying: false };
      if (find(card.flashcardId) === undefined) {
        onHeld();
        return set([...cards, listed]);
      }
      set(
        cards.map((other) =>
          other.flashcardId === card.flashcardId ? listed : other,
        ),
      );
    },
    /** Takes a card off the list, as once it is saved or discarded, and returns it. */
    remove,
    retry,
    retryAll() {
      for (const listed of cards) retry(listed.flashcardId);
    },
    /** Takes a card off the list to be opened in the editor of its media file, which takes it with `takeOpening`. */
    requestOpen(flashcardId: string) {
      const listed = remove(flashcardId);
      if (!listed) return undefined;
      opening = listed;
      for (const listener of listeners) listener();
      return listed;
    },
    /** Hands the editor of a media file the card waiting to be opened there, if there is one. */
    takeOpening(mediaFileId: string): EditedFlashcard | undefined {
      if (opening?.mediaFileId !== mediaFileId) return undefined;
      const { card } = opening;
      opening = null;
      return card;
    },
  };
}

export type UnsavedCardStore = ReturnType<typeof createUnsavedCardStore>;
