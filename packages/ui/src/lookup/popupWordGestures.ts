import type { WordGestures } from "../components/useWordGestures.ts";
import type { PopupWordActions } from "./popupWordContext.ts";

/**
 * The gestures of a word inside the dictionary pop-up: a click looks it up there, and a double-click or held tap makes a flashcard of it.
 * The pop-up shows a clicked word only once the double-click interval has passed, so that a double-click still lands on the word;
 * its lookup starts at once, so that the wait is the longer of the interval and the lookup, not their sum.
 */
export function popupWordGestures(
  onLookup: (word: string) => void,
  actions: PopupWordActions | null,
): WordGestures {
  if (actions === null) return { onWordClick: (hit) => onLookup(hit.word) };
  return {
    onWordClick: (hit) => onLookup(hit.word),
    onWordClickStarted: (hit) => actions.onLookupStarted(hit.word),
    onWordDoubleClick: (hit) => actions.onFlashcard(hit.word),
    onWordHold: (hit) => actions.onFlashcard(hit.word),
    defersClick: true,
  };
}
