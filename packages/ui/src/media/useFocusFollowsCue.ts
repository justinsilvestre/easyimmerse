import { type FocusEvent, useLayoutEffect, useRef } from "react";
import { clickableWordAttribute } from "../components/lookupTrigger.ts";

/**
 * Keeps keyboard focus in the text of the shown cue when the cue changes under it, as during playback or after a step to the next cue:
 * the words that had focus go with their cue, so focus moves to the first word of the new one.
 * Returns the ref and the handlers for the element that holds the cue's text.
 */
export function useFocusFollowsCue(cueIndex: number | undefined) {
  const ref = useRef<HTMLParagraphElement>(null);
  const hadFocus = useRef(false);
  useLayoutEffect(() => {
    const text = ref.current;
    const isFocusLost =
      document.activeElement === null ||
      document.activeElement === document.body;
    if (!hadFocus.current || !isFocusLost || cueIndex === undefined) return;
    text
      ?.querySelector<HTMLElement>(`[${clickableWordAttribute}]`)
      ?.focus({ preventScroll: true });
  }, [cueIndex]);
  return {
    ref,
    onFocus: () => {
      hadFocus.current = true;
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null))
        return;
      // A word that goes with its cue may report losing focus as it goes, which does not count as focus leaving the text.
      const word = event.target;
      queueMicrotask(() => {
        if (word.isConnected) hadFocus.current = false;
      });
    },
  };
}
