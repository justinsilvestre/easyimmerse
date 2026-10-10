import type { NewFlashcard } from "@easyimmerse/types";
import type { AppAction } from "../app/appAction.ts";
import type { FlashcardDestination } from "./flashcardActions.ts";

/**
 * The flashcard that needs no lookup an action starts, with where it goes: one started outright,
 * or the one for no word that the C or E key asks for when the screen showed no cursor.
 */
export function flashcardStartedBy(
  action: AppAction,
): { flashcard: NewFlashcard; destination: FlashcardDestination } | null {
  if (action.type === "flashcardStarted") return action;
  if (action.type !== "lookupCursorFlashcardRequested") return null;
  return action.atCursor !== null || action.wordless === null
    ? null
    : { flashcard: action.wordless, destination: action.destination };
}
