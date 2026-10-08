import type { WordGestures } from "../components/useWordGestures.ts";
import type { PopupWordActions } from "./popupWordContext.ts";

/**
 * The gestures of a word inside the dictionary pop-up: a double-click or double tap, or Shift+Enter or Shift+Space on the focused word, looks it up there,
 * and a held tap makes a flashcard of it.
 * A single click does nothing to the word, so that it reaches the entry's own clickable elements, such as a summary line that shows or hides a section.
 */
export function popupWordGestures(
  onLookup: (word: string) => void,
  actions: PopupWordActions | null,
): WordGestures {
  const onWordDoubleClick: WordGestures["onWordDoubleClick"] = (hit) =>
    onLookup(hit.word);
  if (actions === null) return { onWordDoubleClick };
  return {
    onWordDoubleClick,
    onWordHold: (hit) => actions.onFlashcard(hit.word),
  };
}
