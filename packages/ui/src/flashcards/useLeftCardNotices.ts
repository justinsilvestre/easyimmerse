import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNotices } from "../notices/NoticesContext.tsx";
import type { EditedFlashcard } from "./editedFlashcard.ts";
import { flashcardNotices } from "./flashcardNotices.ts";
import { useUnsavedWorkTracking } from "./useUnsavedWorkTracking.ts";

/**
 * The notices about cards that left the editor unsaved:
 * - a failed save leaves a lasting notice with Retry, and with Reopen while the screen is mounted.
 *   Its edits count as unsaved work until the card is retried, reopened or discarded by dismissing the notice,
 *   after which a brief notice offers Undo, bringing the failure notice back;
 * - a discarded card gains a brief notice with Undo, which reopens it and goes when the screen does.
 * `reopen` brings a card back to the editor.
 */
export function useLeftCardNotices(reopen: (card: EditedFlashcard) => void) {
  const notices = useNotices();
  const { hold } = useUnsavedWorkTracking();
  /** The notices whose actions need this screen's editor, which go or lose those actions when the screen does. */
  const [screenNotices] = useState(() => ({
    reopenable: new Set<number>(),
    discarded: new Set<number>(),
  }));
  const screen = useRef({ isMounted: false, reopen });
  useLayoutEffect(() => {
    screen.current.reopen = reopen;
  });
  useEffect(() => {
    const current = screen.current;
    current.isMounted = true;
    return () => {
      current.isMounted = false;
      for (const id of screenNotices.reopenable)
        notices.withdrawAction(id, "Reopen");
      for (const id of screenNotices.discarded) notices.dismiss(id);
      screenNotices.reopenable.clear();
      screenNotices.discarded.clear();
    };
  }, [notices, screenNotices]);
  /** Shows that `card` failed to save. `retry` sends it again; `discard` runs once the user dismisses the notice. */
  function showFailure(
    card: EditedFlashcard,
    retry: () => void,
    discard: () => void,
  ) {
    const word = card.editor.content.word;
    const release = hold();
    const retryCard = () => {
      retry();
      release();
    };
    const discardCard = () => {
      release();
      discard();
      notices.show(
        flashcardNotices.discarded(word, () =>
          showFailure(card, retry, discard),
        ),
      );
    };
    if (!screen.current.isMounted)
      return void notices.show(
        flashcardNotices.saveFailed(word, retryCard, discardCard),
      );
    const reopenCard = () => {
      screen.current.reopen(card);
      release();
    };
    screenNotices.reopenable.add(
      notices.show(
        flashcardNotices.saveFailed(word, retryCard, discardCard, reopenCard),
      ),
    );
  }
  return {
    isScreenMounted: () => screen.current.isMounted,
    showFailure,
    /** Shows that a changed card was closed without saving, with an Undo that reopens it. */
    showDiscarded: (card: EditedFlashcard) => {
      const undo = () => screen.current.reopen(card);
      screenNotices.discarded.add(
        notices.show(
          flashcardNotices.discarded(card.editor.content.word, undo),
        ),
      );
    },
  };
}
