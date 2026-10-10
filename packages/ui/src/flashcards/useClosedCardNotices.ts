import { actions } from "@easyimmerse/state";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { type EditedFlashcard, flashcardIdOf } from "./editedFlashcard.ts";
import { flashcardNoticeKeys, flashcardNotices } from "./flashcardNotices.ts";

/**
 * Shows that a card was closed without saving, with an Undo that brings it back to this screen's editor through `reopen`.
 * The notice needs the editor, so it goes when the screen does. A second close of the same card replaces its notice.
 */
export function useClosedCardNotices(reopen: (card: EditedFlashcard) => void) {
  const dispatch = useAppDispatch();
  // The set of shown keys and the cleanup below are transitional: they go once the open form lives in the screen's state.
  const [shownKeys] = useState(() => new Set<string>());
  const screen = useRef({ isMounted: false, reopen });
  useLayoutEffect(() => {
    screen.current.reopen = reopen;
  });
  useEffect(() => {
    const current = screen.current;
    current.isMounted = true;
    return () => {
      current.isMounted = false;
      for (const key of shownKeys) dispatch(actions.noticeWithdrawn(key));
      shownKeys.clear();
    };
  }, [dispatch, shownKeys]);
  return {
    /** Tells whether the screen is still showing. */
    isScreenMounted: () => screen.current.isMounted,
    /** Shows that a changed card was closed without saving, with an Undo that reopens it. */
    showClosed: (card: EditedFlashcard) => {
      const undo = () => screen.current.reopen(card);
      const key = flashcardNoticeKeys.closed(flashcardIdOf(card));
      shownKeys.add(key);
      const content = flashcardNotices.discarded(
        card.editor.content.word,
        undo,
      );
      dispatch(actions.noticeRequested({ ...content, key }));
    },
  };
}
