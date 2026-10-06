import type { ListedUnsavedCard } from "./unsavedCardStore.ts";

/**
 * Marks the listed card `opening` to be opened in the editor of its media file.
 * Any other card waiting to open there loses its mark, so that a media file's editor has at most one card waiting.
 */
export function withOpeningMarked(
  cards: readonly ListedUnsavedCard[],
  opening: ListedUnsavedCard,
): readonly ListedUnsavedCard[] {
  return cards.map((other) =>
    other.mediaFileId === opening.mediaFileId
      ? { ...other, isOpening: other === opening }
      : other,
  );
}

/** Clears the opening marks of the cards `isGivenUp` matches, and returns the cards that lost their mark. */
export function withOpeningsCleared(
  cards: readonly ListedUnsavedCard[],
  isGivenUp: (card: ListedUnsavedCard) => boolean,
): { cards: readonly ListedUnsavedCard[]; givenUp: ListedUnsavedCard[] } {
  const givenUp = cards.filter((card) => card.isOpening && isGivenUp(card));
  return {
    cards: cards.map((card) =>
      givenUp.includes(card) ? { ...card, isOpening: false } : card,
    ),
    givenUp,
  };
}
