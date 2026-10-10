import { type AppAction, actions } from "@easyimmerse/state";
import type { AudioClip } from "@easyimmerse/types";
import type { CardSession, EditedFlashcardAction } from "./editedFlashcard.ts";

/**
 * The clip loop's action for an action of the editor, given the opening the editor showed before it and shows after it:
 * a card opening with its clip, the open card's clip moving, the card closing, or null for anything else.
 * Transitional: once the open card is in the store, the loop reads its clip there.
 */
export function clipActionOf(
  before: CardSession | null,
  after: CardSession | null,
  action: EditedFlashcardAction,
): AppAction | null {
  if (after !== null && after !== before)
    return actions.editedClipOpened(openedClipOf(action));
  if (after === null)
    return before === null ? null : actions.editedClipClosed();
  return action.type === "edited" && action.action.type === "clipChanged"
    ? actions.editedClipMoved(action.action.clip)
    : null;
}

function openedClipOf(action: EditedFlashcardAction): AudioClip | null {
  switch (action.type) {
    case "started":
      return action.draft.content.audio_context;
    case "opened":
      return action.flashcard.content.audio_context;
    case "restored":
      return action.card.editor.content.audio_context;
    default:
      return null;
  }
}
