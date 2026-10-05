import { type Dispatch, useEffect, useRef, useState } from "react";
import { useTimer } from "../hooks/useTimer.ts";
import { saveLookupWaitMs } from "../lookup/lookupTiming.ts";
import type {
  EditedFlashcard,
  EditedFlashcardAction,
} from "./editedFlashcard.ts";
import { createSaveQueue } from "./saveQueue.ts";
import { isSaveAsked } from "./saveStage.ts";

/** Tells of a save's outcome, and whether its card had left the screen by the time the save finished. */
export type SaveReports = {
  saved: (card: EditedFlashcard, isInBackground: boolean) => void;
  failed: (card: EditedFlashcard, isInBackground: boolean) => void;
};

/**
 * Sends the open card once a save is ready, and reports whether it was saved, so that only that card closes.
 * A save that waits for a lookup stops waiting after `saveLookupWaitMs` and saves the card as it is.
 * When the editor goes away, as when the screen closes, the open card is saved as it is in the background,
 * if the user has asked to save it or has changed it.
 * Returns a function that saves the open card as it is, in the background, before another replaces it in the editor,
 * if the user has asked to save it or has changed it.
 */
export function useFlashcardSaving(
  edited: EditedFlashcard | null,
  dispatchEdited: Dispatch<EditedFlashcardAction>,
  send: (card: EditedFlashcard) => Promise<unknown>,
  reports: SaveReports,
): () => void {
  const [queue] = useState(createSaveQueue);
  const latest = useRef({ edited, isMounted: false });
  useEffect(() => {
    latest.current.edited = edited;
  });
  /** Whether the editor still shows the card, which decides how a save that finishes is told of. */
  const isOnScreen = (card: EditedFlashcard) =>
    latest.current.isMounted && latest.current.edited?.session === card.session;
  const sendAndReport = (card: EditedFlashcard) => {
    const { session } = card;
    queue
      .add(card, () => send(card))
      ?.then(
        () => {
          const isInBackground = !isOnScreen(card);
          dispatchEdited({ type: "saved", session });
          reports.saved(card, isInBackground);
        },
        () => {
          const isInBackground = !isOnScreen(card);
          dispatchEdited({ type: "saveFailed", session });
          reports.failed(card, isInBackground);
        },
      );
  };
  useEffect(() => {
    if (edited?.stage !== "readyToSend") return;
    dispatchEdited({ type: "sendStarted" });
    sendAndReport(edited);
  });
  const waitingDraft =
    edited?.kind === "new" && edited.stage === "awaitingLookupToSave"
      ? edited.draft
      : null;
  const giveUp = useTimer();
  useEffect(() => {
    if (waitingDraft === null) {
      giveUp.cancel();
      return;
    }
    giveUp.restart(saveLookupWaitMs, () =>
      dispatchEdited({ type: "lookupFailed", draft: waitingDraft }),
    );
  }, [waitingDraft, giveUp, dispatchEdited]);
  const sendLeft = useRef(sendAndReport);
  useEffect(() => {
    sendLeft.current = sendAndReport;
  });
  useEffect(() => {
    const current = latest.current;
    current.isMounted = true;
    return () => {
      current.isMounted = false;
      const left = current.edited;
      if (left && isWorthSavingWhenLeft(left)) sendLeft.current(left);
    };
  }, []);
  return () => {
    if (edited && isWorthSavingWhenLeft(edited)) sendAndReport(edited);
  };
}

/**
 * Tells whether a card the editor is leaving, for another card or as the screen closes, should be saved first, as it is:
 * one the user has asked to save, or changed. A new card left untouched is dropped, as it holds nothing of the user's.
 */
function isWorthSavingWhenLeft(card: EditedFlashcard): boolean {
  if (isSaveAsked(card.stage)) return true;
  return (
    card.isChanged &&
    (card.stage === "editing" || card.stage === "awaitingLookup")
  );
}
