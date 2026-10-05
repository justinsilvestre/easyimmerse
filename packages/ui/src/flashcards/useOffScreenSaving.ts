import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import { saveRequestLimitMs } from "../lookup/lookupTiming.ts";
import { withinTime } from "../lookup/withinTime.ts";
import { useNotices } from "../notices/NoticesContext.tsx";
import {
  type EditedFlashcard,
  reduceEditedFlashcard,
} from "./editedFlashcard.ts";
import { flashcardNotices } from "./flashcardNotices.ts";
import { createSaveQueue } from "./saveQueue.ts";
import { isSaveAsked } from "./saveStage.ts";
import type { useFlashcardRequests } from "./useFlashcardRequests.ts";
import { useSaveUndo } from "./useSaveUndo.ts";
import { useUnsavedWorkTracking } from "./useUnsavedWorkTracking.ts";
import { withTimeLimit } from "./withTimeLimit.ts";

type FlashcardRequests = ReturnType<typeof useFlashcardRequests>;

/**
 * Sends flashcard saves through one queue, counting each as pending so that the app warns before closing meanwhile,
 * and saves the cards that leave the editor, with notices about them:
 * - a card saved without the user pressing Save gains an Undo notice, as `useSaveUndo` describes;
 * - a failed save leaves a lasting notice with Retry, and with Reopen while the screen is mounted;
 * - a discarded card gains an Undo notice that reopens it, which goes when the screen does.
 * `reopen` brings a card back to the editor.
 */
export function useOffScreenSaving(
  requests: FlashcardRequests,
  reopen: (card: EditedFlashcard) => void,
) {
  const notices = useNotices();
  const [queue] = useState(createSaveQueue);
  const [lookups] = useState(
    () => new WeakMap<FlashcardDraft, Promise<LookupFlashcardFields | null>>(),
  );
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
  const { track, hold } = useUnsavedWorkTracking();
  const undo = useSaveUndo(queue, requests);
  /**
   * Sends a card's save, or returns undefined when this opening's save is already under way.
   * The caller counts the save, with what it does on settling, as unsaved work through `track`.
   * A request left unanswered for `saveRequestLimitMs` counts as failed.
   */
  const send = (card: EditedFlashcard) => {
    undo.withdraw(
      card.kind === "existing" ? card.flashcard.id : card.flashcardId,
    );
    return queue.add(card, () =>
      withTimeLimit(
        (signal) => requests.send(card, signal),
        saveRequestLimitMs,
      ),
    );
  };
  /** Leaves a notice holding a failed card's edits, which count as unsaved work until the card is retried, reopened or discarded. */
  const showFailure = (card: EditedFlashcard) => {
    const word = card.editor.content.word;
    const release = hold();
    const retry = () => {
      saveOffScreen(card, false);
      release();
    };
    const discard = () => {
      release();
      notices.show(flashcardNotices.discarded(word, () => showFailure(card)));
    };
    if (!screen.current.isMounted)
      return void notices.show(
        flashcardNotices.saveFailed(word, retry, discard),
      );
    const reopenCard = () => {
      screen.current.reopen(card);
      release();
    };
    screenNotices.reopenable.add(
      notices.show(
        flashcardNotices.saveFailed(word, retry, discard, reopenCard),
      ),
    );
  };
  function saveOffScreen(card: EditedFlashcard, offersUndo: boolean) {
    const saving = send(card);
    if (!saving) return;
    track(
      saving.then(
        (saved) => offersUndo && undo.offer(card, saved),
        () => showFailure(card),
      ),
    );
  }
  return {
    isScreenMounted: () => screen.current.isMounted,
    withdrawUndo: undo.withdraw,
    /** Deletes a saved flashcard after any earlier work on it. */
    remove: (flashcard: Flashcard) => {
      undo.withdraw(flashcard.id);
      return track(
        queue.addFor(flashcard.id, () => requests.remove(flashcard)),
      );
    },
    /** Saves changes to a flashcard that is not open in the editor, after any earlier work on it. */
    replace: (flashcard: Flashcard, changes: Partial<FlashcardDraft>) => {
      undo.withdraw(flashcard.id);
      return track(
        queue.addFor(flashcard.id, () => requests.replace(flashcard, changes)),
      );
    },
    send,
    track,
    showFailure,
    /** Saves a card that has left the editor, with an Undo notice when the user did not ask for the save. */
    save: (card: EditedFlashcard) =>
      saveOffScreen(card, !isSaveAsked(card.stage)),
    /** Waits up to `waitMs` for the lookup of a new card that left the editor before it answered, then saves the card filled from it. */
    saveAfterLookup: (card: EditedFlashcard, waitMs: number) => {
      if (card.kind !== "new") return;
      const { draft } = card;
      const lateFields = lookups.get(draft) ?? Promise.resolve(null);
      track(withinTime(lateFields, waitMs, null)).then((fields) => {
        const filled = reduceEditedFlashcard(
          card,
          fields
            ? { type: "lookupAnswered", draft, fields }
            : { type: "lookupFailed", draft },
        );
        if (filled) saveOffScreen(filled, !isSaveAsked(card.stage));
      });
    },
    /** Shows that a changed card was closed without saving, with an Undo that reopens it. */
    showDiscarded: (card: EditedFlashcard) => {
      const undo = () => screen.current.reopen(card);
      screenNotices.discarded.add(
        notices.show(
          flashcardNotices.discarded(card.editor.content.word, undo),
        ),
      );
    },
    /** Remembers the lookup a new card's late fields come from, for waiting on it once the card has left the editor. */
    rememberLookup: (
      draft: FlashcardDraft,
      lateFields: Promise<LookupFlashcardFields | null>,
    ) => lookups.set(draft, lateFields),
  };
}
