import { actions } from "@easyimmerse/state";
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
import { isAwaitingLookup, isSaveAsked } from "./saveStage.ts";
import type { useFlashcardRequests } from "./useFlashcardRequests.ts";
import { useOffScreenSaving } from "./useOffScreenSaving.ts";

/**
 * Saves flashcards: the open card once its save is ready, and any card the editor leaves, as it is, in the background.
 * - A save that waits for a lookup stops waiting `saveLookupWaitMs` after Save was pressed and saves the card as it is,
 *   and keeps waiting, within the same limit, if the editor leaves the card.
 * - The open card counts as unsaved work while it has unsaved changes or a save the user asked for, so that the app warns before closing meanwhile.
 * - A card that leaves the editor is dealt with as `useOffScreenSaving` describes.
 * `openSession` is the opening the editor will show once React has rendered every action dispatched so far.
 */
export function useFlashcardSaving(
  edited: EditedFlashcard | null,
  dispatchEdited: Dispatch<EditedFlashcardAction>,
  requests: ReturnType<typeof useFlashcardRequests>,
  openSession: RefObject<CardSession | null>,
) {
  const dispatch = useAppDispatch();
  /** Brings a card back to the editor, dealing with the card open there as it leaves. */
  const reopen = (card: EditedFlashcard) =>
    replaceOpenCard(() =>
      dispatchEdited({ type: "restored", card, session: createCardSession() }),
    );
  const offScreen = useOffScreenSaving(requests, reopen);
  const [isSaved, setSaved] = useState(false);
  const isOnScreen = (card: EditedFlashcard) =>
    offScreen.isScreenMounted() && openSession.current === card.session;
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
    edited !== null && (edited.isChanged || isSaveAsked(edited.stage));
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
    const card = edited;
    const saving = offScreen.send(card);
    if (!saving) return;
    offScreen.track(
      saving.then(
        () => {
          const wasOnScreen = isOnScreen(card);
          dispatchEdited({ type: "saved", session: card.session });
          if (wasOnScreen) setSaved(true);
        },
        (error: unknown) => {
          const wasOnScreen = isOnScreen(card);
          dispatchEdited({ type: "saveFailed", session: card.session });
          if (!wasOnScreen) return offScreen.showFailure(card, error);
          dispatch(
            actions.notificationRequested("The flashcard could not be saved"),
          );
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
    isSaved,
    dismissSaved: () => setSaved(false),
    replaceOpenCard,
    reopen,
    /** Closes a card without saving it; a changed one can be brought back with Undo. */
    discard: (card: EditedFlashcard) => {
      dispatchEdited({ type: "closed" });
      offScreen.cleanUpAfterDiscard(card);
      if (card.isChanged) offScreen.showDiscarded(card);
    },
    rememberLookup: offScreen.rememberLookup,
    replace: offScreen.replace,
    latestOf: offScreen.latestOf,
    remove: offScreen.remove,
    withdrawUndo: offScreen.withdrawUndo,
  };
}
