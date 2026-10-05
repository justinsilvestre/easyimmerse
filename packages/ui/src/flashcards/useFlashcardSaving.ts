import { type Dispatch, useEffect } from "react";
import { useTimer } from "../hooks/useTimer.ts";
import { saveLookupWaitMs } from "../lookup/lookupTiming.ts";
import {
  type EditedFlashcard,
  type EditedFlashcardAction,
  sourceOf,
} from "./editedFlashcard.ts";

/**
 * Sends the open card once a save is ready, and reports whether it was saved, so that only that card closes.
 * A save that waits for a lookup stops waiting after `saveLookupWaitMs` and saves the card as it is.
 * Returns a function that saves a card whose save waits, as it is, as when another card replaces it in the editor.
 */
export function useFlashcardSaving(
  edited: EditedFlashcard | null,
  dispatchEdited: Dispatch<EditedFlashcardAction>,
  send: (card: EditedFlashcard) => Promise<unknown>,
): () => void {
  const sendAndReport = (card: EditedFlashcard) => {
    const source = sourceOf(card);
    send(card).then(
      () => dispatchEdited({ type: "saved", source }),
      () => dispatchEdited({ type: "saveFailed", source }),
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
    if (waitingDraft === null) return giveUp.cancel();
    giveUp.restart(saveLookupWaitMs, () =>
      dispatchEdited({ type: "lookupFailed", draft: waitingDraft }),
    );
  }, [waitingDraft, giveUp, dispatchEdited]);
  return () => {
    if (edited?.stage === "awaitingLookupToSave") sendAndReport(edited);
  };
}
