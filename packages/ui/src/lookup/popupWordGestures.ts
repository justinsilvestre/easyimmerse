import type { WordGestures } from "../components/useWordGestures.ts";

/**
 * The gestures of a word inside the dictionary pop-up: a click looks it up there, and a double-click or held tap makes a flashcard of it.
 * A click is held back for the double-click interval, since looking a word up replaces the text under the pointer.
 */
export function popupWordGestures(
  onLookup: (word: string) => void,
  onFlashcard: ((word: string) => void) | null,
): WordGestures {
  if (onFlashcard === null) return { onWordClick: (hit) => onLookup(hit.word) };
  return {
    onWordClick: (hit) => onLookup(hit.word),
    onWordDoubleClick: (hit) => onFlashcard(hit.word),
    onWordHold: (hit) => onFlashcard(hit.word),
    defersClick: true,
  };
}
