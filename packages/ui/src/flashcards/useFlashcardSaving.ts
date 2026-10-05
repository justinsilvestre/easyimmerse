import { actions } from "@easyimmerse/state";
import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { type Dispatch, useEffect, useRef, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useTimer } from "../hooks/useTimer.ts";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import { saveLookupWaitMs } from "../lookup/lookupTiming.ts";
import { withinTime } from "../lookup/withinTime.ts";
import { useNotices } from "../notices/NoticesContext.tsx";
import {
  type EditedFlashcard,
  type EditedFlashcardAction,
  reduceEditedFlashcard,
} from "./editedFlashcard.ts";
import { flashcardNotices } from "./flashcardNotices.ts";
import { createSaveQueue } from "./saveQueue.ts";
import { isAwaitingLookup, isSaveAsked } from "./saveStage.ts";
import type { useFlashcardRequests } from "./useFlashcardRequests.ts";

type FlashcardRequests = ReturnType<typeof useFlashcardRequests>;

/**
 * Saves flashcards: the open card once its save is ready, and any card the editor leaves, as it is, in the background.
 * - A save that waits for a lookup stops waiting after `saveLookupWaitMs` and saves the card as it is,
 *   and keeps waiting, within the same limit, if the editor leaves it.
 * - A card left without Save, new or changed, is saved with an Undo notice; one left with Save pressed is saved quietly.
 * - A save that fails once its card is off screen leaves a notice that keeps the card's edits, with Retry and Reopen.
 * - A changed card closed without saving is discarded with an Undo notice that reopens it.
 * `reopen` brings a card back to the editor, after dealing with the card open there.
 */
export function useFlashcardSaving(
  edited: EditedFlashcard | null,
  dispatchEdited: Dispatch<EditedFlashcardAction>,
  requests: FlashcardRequests,
  reopen: (card: EditedFlashcard) => void,
) {
  const dispatch = useAppDispatch();
  const notices = useNotices();
  const [queue] = useState(createSaveQueue);
  const [lookups] = useState(
    () => new WeakMap<FlashcardDraft, Promise<LookupFlashcardFields | null>>(),
  );
  const [isSaved, setSaved] = useState(false);
  const latest = useRef({ edited, isMounted: false, reopen });
  useEffect(() => {
    latest.current.edited = edited;
    latest.current.reopen = reopen;
  });
  /** The notices whose actions bring a card back to the editor, which can no longer act once the screen has gone. */
  const [failureNotices] = useState(() => new Set<number>());
  const [discardNotices] = useState(() => new Set<number>());
  const isOnScreen = (card: EditedFlashcard) =>
    latest.current.isMounted && latest.current.edited?.session === card.session;
  /** Counts work that closing the app would lose, so that the app warns before closing meanwhile. */
  const track = <T>(work: Promise<T>): Promise<T> => {
    dispatch(actions.saveBegan());
    return work.finally(() => dispatch(actions.saveEnded()));
  };
  const reopenLater = (card: EditedFlashcard) => () => {
    if (latest.current.isMounted) latest.current.reopen(card);
  };
  const showFailure = (card: EditedFlashcard) => {
    const id = notices.show(
      flashcardNotices.saveFailed(
        card.editor.content.word,
        () => saveOffScreen(card, false),
        reopenLater(card),
      ),
    );
    failureNotices.add(id);
  };
  const offerUndo = (card: EditedFlashcard, saved: Flashcard) =>
    notices.show(
      flashcardNotices.savedWithUndo(card.editor.content.word, () => {
        track(requests.undoSave(card, saved)).catch(() =>
          notices.show(flashcardNotices.undoFailed(card.editor.content.word)),
        );
      }),
    );
  /** Saves a card that has left the editor, with an Undo notice when the user did not ask for the save. */
  function saveOffScreen(card: EditedFlashcard, offersUndo: boolean) {
    const saving = queue.add(card, () => requests.send(card));
    if (!saving) return;
    track(saving).then(
      (saved) => {
        dispatchEdited({ type: "saved", session: card.session });
        if (offersUndo) offerUndo(card, saved);
      },
      () => {
        dispatchEdited({ type: "saveFailed", session: card.session });
        showFailure(card);
      },
    );
  }
  /** Waits, within the limit, for the lookup of a card that left the editor before it answered, then saves it filled. */
  const saveAfterLookup = (card: EditedFlashcard, waitMs: number) => {
    if (card.kind !== "new") return;
    const offersUndo = !isSaveAsked(card.stage);
    const lateFields = lookups.get(card.draft) ?? Promise.resolve(null);
    const draft = card.draft;
    track(withinTime(lateFields, waitMs, null)).then((fields) => {
      const filled = reduceEditedFlashcard(
        card,
        fields
          ? { type: "lookupAnswered", draft, fields }
          : { type: "lookupFailed", draft },
      );
      if (filled) saveOffScreen(filled, offersUndo);
    });
  };
  const waitStartedAt = useRef<number | null>(null);
  /** Deals with a card the editor leaves, for another card or as the screen closes. */
  const leave = (card: EditedFlashcard) => {
    if (card.stage === "sending") return;
    if (card.kind === "existing" && !card.isChanged && card.stage === "editing")
      return;
    if (isAwaitingLookup(card.stage)) {
      const startedAt = waitStartedAt.current ?? Date.now();
      return saveAfterLookup(card, saveLookupWaitMs - (Date.now() - startedAt));
    }
    saveOffScreen(card, !isSaveAsked(card.stage));
  };
  useEffect(() => {
    if (edited?.stage !== "readyToSend") return;
    dispatchEdited({ type: "sendStarted" });
    const card = edited;
    const saving = queue.add(card, () => requests.send(card));
    if (!saving) return;
    track(saving).then(
      () => {
        const wasOnScreen = isOnScreen(card);
        dispatchEdited({ type: "saved", session: card.session });
        if (wasOnScreen) setSaved(true);
      },
      () => {
        const wasOnScreen = isOnScreen(card);
        dispatchEdited({ type: "saveFailed", session: card.session });
        if (wasOnScreen)
          dispatch(
            actions.notificationRequested("The flashcard could not be saved"),
          );
        else showFailure(card);
      },
    );
  });
  const waitingDraft =
    edited?.kind === "new" && edited.stage === "awaitingLookupToSave"
      ? edited.draft
      : null;
  const giveUp = useTimer();
  useEffect(() => {
    if (waitingDraft === null) {
      waitStartedAt.current = null;
      giveUp.cancel();
      return;
    }
    waitStartedAt.current = Date.now();
    giveUp.restart(saveLookupWaitMs, () =>
      dispatchEdited({ type: "lookupFailed", draft: waitingDraft }),
    );
  }, [waitingDraft, giveUp, dispatchEdited]);
  const leaveOnClose = useRef(leave);
  useEffect(() => {
    leaveOnClose.current = leave;
  });
  useEffect(() => {
    const current = latest.current;
    current.isMounted = true;
    return () => {
      current.isMounted = false;
      if (current.edited) leaveOnClose.current(current.edited);
      // Retry still works from anywhere; reopening needs this screen's editor.
      for (const id of failureNotices) notices.withdrawAction(id, "Reopen");
      for (const id of discardNotices) notices.dismiss(id);
      failureNotices.clear();
      discardNotices.clear();
    };
  }, [notices, failureNotices, discardNotices]);
  return {
    isSaved,
    dismissSaved: () => setSaved(false),
    leave,
    /** Closes a card without saving it; a changed one can be brought back with Undo. */
    discard: (card: EditedFlashcard) => {
      dispatchEdited({ type: "closed" });
      if (!card.isChanged) return;
      const id = notices.show(
        flashcardNotices.discarded(card.editor.content.word, reopenLater(card)),
      );
      discardNotices.add(id);
    },
    /** Remembers the lookup a new card's late fields come from, for waiting on it once the card has left the editor. */
    rememberLookup: (
      draft: FlashcardDraft,
      lateFields: Promise<LookupFlashcardFields | null>,
    ) => lookups.set(draft, lateFields),
  };
}
