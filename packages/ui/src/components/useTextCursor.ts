import { useReducer, useState } from "react";
import { reduceTextCursor, type TextCursor } from "./textCursor.ts";
import type { WordGestures } from "./useWordGestures.ts";

/**
 * The lookup cursor of a clickable text: `cursor` when it is given, with null for none,
 * as when a screen keeps one cursor for several texts; otherwise a cursor the text keeps for itself, which goes when the text changes.
 * Returns the cursor, and the gestures to report to, which move a cursor the text keeps before passing on to `gestures`.
 */
export function useTextCursor(
  text: string,
  cursor: TextCursor | null | undefined,
  gestures: WordGestures,
) {
  const [ownCursor, dispatch] = useReducer(reduceTextCursor, null);
  const [cursorText, setCursorText] = useState(text);
  if (cursorText !== text) {
    setCursorText(text);
    dispatch({ type: "cleared" });
  }
  const isOwn = cursor === undefined;
  const reportedGestures: WordGestures = {
    ...gestures,
    onWordPointed: (hit, input) => {
      if (isOwn)
        dispatch(
          hit
            ? {
                type: "pointed",
                start: hit.start,
                input,
                // Without a lookup to wait for, the answer is known at once: nothing matched.
                matchedLength: gestures.onWordHover ? undefined : null,
              }
            : { type: "left", input },
        );
      gestures.onWordPointed?.(hit, input);
    },
    onWordHoverAnswered: (hit, matchedLength) => {
      if (isOwn)
        dispatch({
          type: "answered",
          start: hit.start,
          input: hit.input,
          matchedLength,
        });
      gestures.onWordHoverAnswered?.(hit, matchedLength);
    },
  };
  return {
    cursor: isOwn ? ownCursor : cursor,
    gestures: reportedGestures,
  };
}
