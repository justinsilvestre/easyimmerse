import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { useState } from "react";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import { saveRequestLimitMs } from "../lookup/lookupTiming.ts";
import { withinTime } from "../lookup/withinTime.ts";
import {
  type EditedFlashcard,
  reduceEditedFlashcard,
} from "./editedFlashcard.ts";
import { draftOfFlashcard, withDraft } from "./flashcardDrafts.ts";
import { createSaveQueue } from "./saveQueue.ts";
import { isSaveAsked } from "./saveStage.ts";
import type { useFlashcardRequests } from "./useFlashcardRequests.ts";
import { useLeftCardNotices } from "./useLeftCardNotices.ts";
import { useSaveUndo } from "./useSaveUndo.ts";
import { flashcardIdOf, useTimedOutSaves } from "./useTimedOutSaves.ts";
import { useUnsavedWorkTracking } from "./useUnsavedWorkTracking.ts";
import { withTimeLimit } from "./withTimeLimit.ts";

type FlashcardRequests = ReturnType<typeof useFlashcardRequests>;

/**
 * Sends flashcard saves through one queue, and saves the cards that leave the editor.
 * A card saved without the user pressing Save gains an Undo notice, as `useSaveUndo` describes;
 * a failed save and a discarded card leave the notices `useLeftCardNotices` describes.
 * `reopen` brings a card back to the editor.
 */
export function useOffScreenSaving(
  requests: FlashcardRequests,
  reopen: (card: EditedFlashcard) => void,
) {
  const [queue] = useState(createSaveQueue);
  const [lookups] = useState(
    () => new WeakMap<FlashcardDraft, Promise<LookupFlashcardFields | null>>(),
  );
  const leftCards = useLeftCardNotices(reopen);
  const { track } = useUnsavedWorkTracking();
  const undo = useSaveUndo(queue, requests);
  const timedOut = useTimedOutSaves(queue, requests);
  /**
   * Sends a card's save, or returns undefined when this opening's save is already under way.
   * The caller counts the save, with what it does on settling, as unsaved work through `track`.
   * A request left unanswered for `saveRequestLimitMs` counts as failed.
   */
  const send = (card: EditedFlashcard) => {
    const flashcardId = flashcardIdOf(card);
    const before = beforeOf(card);
    undo.withdraw(flashcardId);
    const saving = queue.add(card, () =>
      withTimeLimit(
        (signal) => requests.send(card, signal),
        saveRequestLimitMs,
      ),
    );
    return saving && timedOut.watch(flashcardId, before, saving);
  };
  const showFailure = (card: EditedFlashcard) =>
    leftCards.showFailure(
      card,
      () => saveOffScreen(card, false),
      () => timedOut.cleanUpAfterDiscard(card),
    );
  /** A saved flashcard as last sent, which the list of flashcards may not show yet while work on it is under way. */
  const latestOf = (flashcard: Flashcard): Flashcard => {
    const latest = queue.latest(flashcard.id);
    return latest ? withDraft(flashcard, latest) : flashcard;
  };
  /** What a card's flashcard holds before its save: the draft last sent for a saved one, or nothing for a new one. */
  const beforeOf = (card: EditedFlashcard) =>
    card.kind === "existing"
      ? draftOfFlashcard(latestOf(card.flashcard))
      : null;
  function saveOffScreen(card: EditedFlashcard, offersUndo: boolean) {
    const before = beforeOf(card);
    const saving = send(card);
    if (!saving) return;
    track(
      saving.then(
        (saved) => offersUndo && undo.offer(card, saved, before),
        () => showFailure(card),
      ),
    );
  }
  return {
    isScreenMounted: leftCards.isScreenMounted,
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
      const latest = latestOf(flashcard);
      const draft = { ...draftOfFlashcard(latest), ...changes };
      return track(
        queue.addFor(
          flashcard.id,
          () => requests.replace(latest, changes),
          draft,
        ),
      );
    },
    latestOf,
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
    showDiscarded: leftCards.showDiscarded,
    cleanUpAfterDiscard: timedOut.cleanUpAfterDiscard,
    /** Remembers the lookup a new card's late fields come from, for waiting on it once the card has left the editor. */
    rememberLookup: (
      draft: FlashcardDraft,
      lateFields: Promise<LookupFlashcardFields | null>,
    ) => lookups.set(draft, lateFields),
  };
}
