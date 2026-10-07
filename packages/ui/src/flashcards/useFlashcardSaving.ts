import { actions } from "@easyimmerse/state";
import type { FlashcardDraft } from "@easyimmerse/types";
import {
  type Dispatch,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useTimer } from "../hooks/useTimer.ts";
import { saveLookupWaitMs } from "../lookup/lookupTiming.ts";
import {
  type CardSession,
  createCardSession,
  type EditedFlashcard,
  type EditedFlashcardAction,
} from "./editedFlashcard.ts";
import { draftOfFlashcard } from "./flashcardDrafts.ts";
import { isAwaitingLookup, isSaveAsked, isSending } from "./saveStage.ts";
import { useOffScreenSaving } from "./useOffScreenSaving.ts";
import { useSaveUndo } from "./useSaveUndo.ts";

/**
 * Saves flashcards: the open card once its save is ready, and any card the editor leaves, as it is, in the background.
 * - A save the user asked for that lands while its card is still open closes the card and shows the brief notice with Undo
 *   that a card saved in the background shows, as `useSaveUndo` describes.
 * - A save the user asked for that fails while its card is still open leaves the card open with `saveFailed` set until Save is pressed again.
 *   Closing the card meanwhile lists it among the flashcards not saved, as a card whose background save failed is listed, rather than dropping it.
 * - A save that waits for a lookup stops waiting `saveLookupWaitMs` after Save was pressed and saves the card as it is,
 *   and keeps waiting, within the same limit, if the editor leaves the card.
 * - The open card counts as unsaved work while it has unsaved changes, a save the user asked for or under way, or a failed save,
 *   so that the app warns before closing meanwhile, without a gap between a save failing and the editor telling of it.
 * - A card that leaves the editor is dealt with as `useOffScreenSaving` describes.
 * `openSession` is the opening the editor will show once React has rendered every action dispatched so far.
 */
export function useFlashcardSaving(
  edited: EditedFlashcard | null,
  dispatchEdited: Dispatch<EditedFlashcardAction>,
  projectId: string,
  openSession: RefObject<CardSession | null>,
) {
  const dispatch = useAppDispatch();
  /** Brings a card back to the editor, dealing with the card open there as it leaves. */
  const reopen = (card: EditedFlashcard) =>
    replaceOpenCard(() =>
      dispatchEdited({ type: "restored", card, session: createCardSession() }),
    );
  const offScreen = useOffScreenSaving(projectId, reopen);
  const undo = useSaveUndo();
  /** The opening whose save the user asked for failed last, with the error it failed with. */
  const [failure, setFailure] = useState<{
    session: CardSession;
    error: unknown;
  } | null>(null);
  const saveFailed = edited !== null && failure?.session === edited.session;
  const isOnScreen = (card: EditedFlashcard) =>
    offScreen.isScreenMounted() && openSession.current === card.session;
  /** What a card's flashcard holds before its save, for its Undo: the content last sent for a saved one, or nothing for a new one. */
  const beforeOf = (card: EditedFlashcard): FlashcardDraft | null =>
    card.kind === "existing"
      ? draftOfFlashcard(offScreen.latestOf(card.flashcard))
      : null;
  const waitStartedAt = useRef<number | null>(null);
  /** Deals with a card the editor leaves, for another card or as the screen closes. */
  const leave = (card: EditedFlashcard) => {
    if (card.stage === "sending") return;
    if (card.kind === "existing" && !card.isChanged && card.stage === "editing")
      return;
    if (!isAwaitingLookup(card.stage)) return offScreen.save(card);
    const startedAt = waitStartedAt.current ?? Date.now();
    offScreen.saveAfterLookup(
      card,
      saveLookupWaitMs - (Date.now() - startedAt),
    );
  };
  const latest = useRef({ edited, leave });
  useLayoutEffect(() => {
    latest.current = { edited, leave };
  });
  /** Replaces the open card in the editor by calling `openNext`, after the card open there has been dealt with as it leaves. */
  const replaceOpenCard = (openNext: () => void) => {
    const { edited: open } = latest.current;
    if (open) leave(open);
    openNext();
  };
  // Declared before the unsaved-work count below, so that a card leaving with the screen is counted again before that count ends.
  useEffect(
    () => () => {
      const { edited: open, leave: leaveOnClose } = latest.current;
      if (open) leaveOnClose(open);
    },
    [],
  );
  const isWorkAtRisk =
    edited !== null &&
    (edited.isChanged ||
      isSending(edited.stage) ||
      isSaveAsked(edited.stage) ||
      saveFailed);
  useEffect(() => {
    if (!isWorkAtRisk) return;
    dispatch(actions.unsavedWorkBegan());
    return () => {
      dispatch(actions.unsavedWorkEnded());
    };
  }, [isWorkAtRisk, dispatch]);
  useEffect(() => {
    if (edited?.stage !== "readyToSend") return;
    dispatchEdited({ type: "sendStarted" });
    setFailure(null);
    const card = edited;
    const before = beforeOf(card);
    const saving = offScreen.send(card);
    if (!saving) return;
    offScreen.track(
      saving.then(
        (saved) => {
          const wasOnScreen = isOnScreen(card);
          dispatchEdited({ type: "saved", session: card.session });
          if (wasOnScreen) undo.offer(card, saved, before);
        },
        (error: unknown) => {
          const wasOnScreen = isOnScreen(card);
          dispatchEdited({ type: "saveFailed", session: card.session });
          if (!wasOnScreen) return offScreen.listFailure(card, error);
          setFailure({ session: card.session, error });
        },
      ),
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
  return {
    /** Whether the save the user last asked for of the open card failed, which stays so until Save is pressed again. */
    saveFailed,
    replaceOpenCard,
    reopen,
    /**
     * Closes a card without saving it; a changed one can be brought back with Undo.
     * A card whose save just failed is listed among the flashcards not saved instead, to be sent again from there.
     */
    discard: (card: EditedFlashcard) => {
      dispatchEdited({ type: "closed" });
      if (failure?.session === card.session) {
        setFailure(null);
        return offScreen.listFailure(card, failure.error);
      }
      offScreen.cleanUpAfterDiscard(card);
      if (card.isChanged) offScreen.showClosed(card);
    },
    /** Saves a new card that never opened in the editor, once its word's lookup answers, fails or has been waited for `saveLookupWaitMs`. */
    saveUnopened: (card: EditedFlashcard) => {
      if (isAwaitingLookup(card.stage))
        offScreen.saveAfterLookup(card, saveLookupWaitMs);
      else offScreen.save(card);
    },
    rememberLookup: offScreen.rememberLookup,
    latestOf: offScreen.latestOf,
    remove: offScreen.remove,
    withdrawUndo: offScreen.withdrawUndo,
  };
}
