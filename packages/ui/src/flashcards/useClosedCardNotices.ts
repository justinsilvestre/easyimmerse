import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNotices } from "../notices/NoticesContext.tsx";
import type { EditedFlashcard } from "./editedFlashcard.ts";
import { flashcardNotices } from "./flashcardNotices.ts";

/**
 * Shows that a card was closed without saving, with an Undo that brings it back to this screen's editor through `reopen`.
 * The notice needs the editor, so it goes when the screen does.
 */
export function useClosedCardNotices(reopen: (card: EditedFlashcard) => void) {
  const notices = useNotices();
  const [shown] = useState(() => new Set<number>());
  const screen = useRef({ isMounted: false, reopen });
  useLayoutEffect(() => {
    screen.current.reopen = reopen;
  });
  useEffect(() => {
    const current = screen.current;
    current.isMounted = true;
    return () => {
      current.isMounted = false;
      for (const id of shown) notices.dismiss(id);
      shown.clear();
    };
  }, [notices, shown]);
  return {
    /** Tells whether the screen is still showing. */
    isScreenMounted: () => screen.current.isMounted,
    /** Shows that a changed card was closed without saving, with an Undo that reopens it. */
    showClosed: (card: EditedFlashcard) => {
      const undo = () => screen.current.reopen(card);
      shown.add(
        notices.show(
          flashcardNotices.discarded(card.editor.content.word, undo),
        ),
      );
    },
  };
}
