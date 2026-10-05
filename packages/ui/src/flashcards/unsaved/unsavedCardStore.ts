import type { FlashcardContent } from "@easyimmerse/types";
import type { EditedFlashcard } from "../editedFlashcard.ts";
import type { UnsavedCard } from "./unsavedCard.ts";

export type ListedUnsavedCard = UnsavedCard & {
  /** Whether a retry the user asked for is under way. */
  readonly isRetrying: boolean;
  /** Whether the user asked to open the card, which stays listed until the editor of its media file takes it. */
  readonly isOpening: boolean;
};

/**
 * Keeps the cards that could not be saved until the user retries, opens or discards them.
 * Retrying happens only when asked for.
 */
export function createUnsavedCardStore() {
  let cards: readonly ListedUnsavedCard[] = [];
  const listeners = new Set<() => void>();
  const set = (next: readonly ListedUnsavedCard[]) => {
    cards = next;
    for (const listener of listeners) listener();
  };
  const find = (flashcardId: string) =>
    cards.find((listed) => listed.flashcardId === flashcardId);
  const change = (
    flashcardId: string,
    changed: (listed: ListedUnsavedCard) => ListedUnsavedCard,
  ) =>
    set(
      cards.map((listed) =>
        listed.flashcardId === flashcardId ? changed(listed) : listed,
      ),
    );
  const remove = (flashcardId: string) => {
    const listed = find(flashcardId);
    if (listed) set(cards.filter((other) => other !== listed));
    return listed;
  };
  /** Sends a card again through `send`, which tells whether it sent anything, and marks the card as being saved if it did. */
  const retry = (flashcardId: string, send: (card: UnsavedCard) => boolean) => {
    const listed = find(flashcardId);
    if (!listed || listed.isRejected || listed.isRetrying) return;
    if (!send(listed)) return;
    change(flashcardId, (sent) => ({
      ...sent,
      isRetrying: true,
      isOpening: false,
    }));
  };
  return {
    list: () => cards,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    find,
    /** Lists a card, in place of any listed under the same flashcard id. */
    put(card: UnsavedCard) {
      const listed = { ...card, isRetrying: false, isOpening: false };
      if (find(card.flashcardId) === undefined) return set([...cards, listed]);
      change(card.flashcardId, () => listed);
    },
    /** Takes a card off the list, as once it is saved or discarded, and returns it. */
    remove,
    retry,
    retryAll(send: (card: UnsavedCard) => boolean) {
      for (const listed of cards) retry(listed.flashcardId, send);
    },
    /** Changes the content of a listed card's edits, as a retiming from the waveform does. */
    editContent(
      flashcardId: string,
      edit: (content: FlashcardContent) => FlashcardContent,
    ) {
      if (find(flashcardId))
        change(flashcardId, (listed) => withContent(listed, edit));
    },
    /**
     * Marks a card to be opened in the editor of its media file, which takes it with `takeOpening`, and returns it.
     * A media file's editor has at most one card waiting to open. A card being saved again, or without a media file, cannot be opened.
     */
    requestOpen(flashcardId: string) {
      const listed = find(flashcardId);
      if (!listed || listed.isRetrying || listed.mediaFileId === null)
        return undefined;
      set(
        cards.map((other) =>
          other.mediaFileId === listed.mediaFileId
            ? { ...other, isOpening: other === listed }
            : other,
        ),
      );
      return listed;
    },
    /** Takes off the list, and hands to the editor of a media file, the card waiting to be opened there, if there is one. */
    takeOpening(mediaFileId: string): EditedFlashcard | undefined {
      const opening = cards.find(
        (listed) => listed.isOpening && listed.mediaFileId === mediaFileId,
      );
      return opening && remove(opening.flashcardId)?.card;
    },
  };
}

export type UnsavedCardStore = ReturnType<typeof createUnsavedCardStore>;

function withContent(
  listed: ListedUnsavedCard,
  edit: (content: FlashcardContent) => FlashcardContent,
): ListedUnsavedCard {
  const { card } = listed;
  const editor = { ...card.editor, content: edit(card.editor.content) };
  return { ...listed, card: { ...card, editor, isChanged: true } };
}
