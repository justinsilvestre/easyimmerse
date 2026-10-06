import { type RefObject, useCallback, useReducer, useRef } from "react";
import {
  type CardSession,
  type EditedFlashcardAction,
  reduceEditedFlashcard,
} from "./editedFlashcard.ts";

/**
 * The card open in the editor, with a dispatch that also records, as each action is dispatched, which opening the editor will show.
 * A save that settles before React has rendered the latest actions is thereby judged against the card that will be on screen.
 */
export function useEditedFlashcard() {
  const [edited, dispatchToEditor] = useReducer(reduceEditedFlashcard, null);
  const openSession: RefObject<CardSession | null> = useRef(null);
  const dispatchEdited = useCallback((action: EditedFlashcardAction) => {
    openSession.current = openSessionAfter(openSession.current, action);
    dispatchToEditor(action);
  }, []);
  return { edited, dispatchEdited, openSession };
}

/** The opening the editor shows after `action`, given the one it showed before. */
function openSessionAfter(
  session: CardSession | null,
  action: EditedFlashcardAction,
): CardSession | null {
  switch (action.type) {
    case "started":
    case "opened":
    case "restored":
      return action.session;
    case "saved":
      return action.session === session ? null : session;
    case "closed":
      return null;
    default:
      return session;
  }
}
