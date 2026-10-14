import type { FlashcardContent, FlashcardFieldKey } from "@easyimmerse/types";
import { flashcardFieldDefinitions } from "./flashcardFields.ts";

/** The fields shown on each side of a card, in the order of `flashcardFieldDefinitions`. */
export type CardSides = {
  front: FlashcardFieldKey[];
  back: FlashcardFieldKey[];
};

/** The fields the front shows when none of the chosen front fields has a value, so that no card has a blank front. */
const fallbackFrontFields: readonly FlashcardFieldKey[] = [
  "word",
  "text_context",
];

/**
 * Splits a card's included fields between its front and its back, as the exported Anki card lays them out.
 * The front holds the included `frontFields`, except the tags. When none of them has a value on this card,
 * the front shows the word and the sentence instead, and the back leaves them out.
 */
export function cardSidesOf(
  content: FlashcardContent,
  includedFields: readonly FlashcardFieldKey[],
  frontFields: readonly FlashcardFieldKey[],
): CardSides {
  const included = flashcardFieldDefinitions
    .map(({ key }) => key)
    .filter((key) => includedFields.includes(key));
  const chosenFront = included.filter(
    (key) => key !== "tags" && frontFields.includes(key),
  );
  const isFallback = !chosenFront.some((key) => hasValue(content, key));
  const front = isFallback
    ? included.filter((key) => fallbackFrontFields.includes(key))
    : chosenFront;
  const hidden = isFallback ? chosenFront : [];
  return {
    front,
    back: included.filter(
      (key) => !front.includes(key) && !hidden.includes(key),
    ),
  };
}

function hasValue(content: FlashcardContent, key: FlashcardFieldKey): boolean {
  const value = content[key];
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return value !== null;
}
