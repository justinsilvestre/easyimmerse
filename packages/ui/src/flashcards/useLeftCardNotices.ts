import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNotices } from "../notices/NoticesContext.tsx";
import type { EditedFlashcard } from "./editedFlashcard.ts";
import { flashcardNotices } from "./flashcardNotices.ts";
import { useUnsavedCards } from "./unsaved/UnsavedCardsContext.tsx";
import { useUnsavedCardActions } from "./unsaved/useUnsavedCardActions.ts";
import { flashcardIdOf } from "./useTimedOutSaves.ts";

/**
 * Tells of cards that left the editor unsaved:
 * - a card whose save failed joins the app's list of unsaved flashcards, which keeps its edits until the user
 *   retries, opens or discards it. A save the server refused also gets a notice of its own, with Open and Discard,
 *   since sending it again cannot succeed; dismissing that notice leaves the card listed.
 * - a card closed without saving gains a brief notice with Undo, which reopens it and goes when the screen does.
 * `reopen` brings a card back to the editor.
 */
export function useLeftCardNotices(
  projectId: string,
  reopen: (card: EditedFlashcard) => void,
) {
  const notices = useNotices();
  const unsavedCards = useUnsavedCards();
  const unsavedCardActions = useUnsavedCardActions();
  /** The Undo notices of cards closed without saving, which need this screen's editor and go when the screen does. */
  const [discardNotices] = useState(() => new Set<number>());
  const screen = useRef({ isMounted: false, reopen });
  useLayoutEffect(() => {
    screen.current.reopen = reopen;
  });
  useEffect(() => {
    const current = screen.current;
    current.isMounted = true;
    return () => {
      current.isMounted = false;
      for (const id of discardNotices) notices.dismiss(id);
      discardNotices.clear();
    };
  }, [notices, discardNotices]);
  return {
    isScreenMounted: () => screen.current.isMounted,
    /**
     * Lists a card whose save failed with `error`. `retry` sends it again;
     * `discard` takes back what the save may have left on the server once the user discards the card.
     */
    listFailure(
      card: EditedFlashcard,
      error: unknown,
      { retry, discard }: { retry: () => void; discard: () => void },
    ) {
      const flashcardId = flashcardIdOf(card);
      const unsaved = {
        flashcardId,
        card,
        projectId,
        mediaFileId: mediaFileIdOf(card),
        isRejected: isRejection(error),
        retry,
        discard,
      };
      if (!unsaved.isRejected) return unsavedCards.put(unsaved);
      const noticeId = notices.show(
        flashcardNotices.saveRejected(card.editor.content.word, {
          open: () => unsavedCardActions.open(flashcardId),
          discard: () => unsavedCardActions.discard(flashcardId),
        }),
      );
      unsavedCards.put({ ...unsaved, noticeId });
    },
    /** Takes a card off the list of unsaved flashcards once a save of it has succeeded. */
    listSaved(card: EditedFlashcard) {
      const listed = unsavedCards.remove(flashcardIdOf(card));
      if (listed?.noticeId !== undefined) notices.dismiss(listed.noticeId);
    },
    /** Shows that a changed card was closed without saving, with an Undo that reopens it. */
    showDiscarded: (card: EditedFlashcard) => {
      const undo = () => screen.current.reopen(card);
      discardNotices.add(
        notices.show(
          flashcardNotices.discarded(card.editor.content.word, undo),
        ),
      );
    },
  };
}

function mediaFileIdOf(card: EditedFlashcard): string | null {
  return card.kind === "new"
    ? card.draft.media_file_id
    : card.flashcard.media_file_id;
}

/** Tells whether the server refused a request, so that sending it again cannot succeed, unlike a lost connection, a timeout or a server error. */
function isRejection(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}
