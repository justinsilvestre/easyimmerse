import { type Dispatch, useEffect, useRef, useState } from "react";
import { useTimer } from "../hooks/useTimer.ts";
import { saveLookupWaitMs } from "../lookup/lookupTiming.ts";
import type {
  EditedFlashcard,
  EditedFlashcardAction,
} from "./editedFlashcard.ts";
import { createSaveQueue } from "./saveQueue.ts";
import { isSaveAsked } from "./saveStage.ts";

/** Tells of a save's outcome. A save in the background is one of a card no longer on screen. */
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
  const sendAndReport = (card: EditedFlashcard, isInBackground: boolean) => {
    const { session } = card;
    queue
      .add(card, () => send(card))
      ?.then(
        () => {
          dispatchEdited({ type: "saved", session });
          reports.saved(card, isInBackground);
        },
        () => {
          dispatchEdited({ type: "saveFailed", session });
          reports.failed(card, isInBackground);
        },
      );
  };
  useEffect(() => {
    if (edited?.stage !== "readyToSend") return;
    dispatchEdited({ type: "sendStarted" });
    sendAndReport(edited, false);
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
  const latest = useRef({ edited, sendAndReport });
  latest.current = { edited, sendAndReport };
  useEffect(
    () => () => {
      const { edited: left, sendAndReport: sendLeft } = latest.current;
      if (left && isWorthSavingWhenLeft(left)) sendLeft(left, true);
    },
    [],
  );
  return () => {
    if (edited && isWorthSavingWhenLeft(edited)) sendAndReport(edited, true);
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
