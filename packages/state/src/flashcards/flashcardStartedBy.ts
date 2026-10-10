import type { NewFlashcard } from "@easyimmerse/types";
import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { FlashcardDestination } from "./flashcardActions.ts";
import { mediaScreenOf } from "./flashcardsOnScreen.ts";

/**
 * The flashcard that needs no lookup an action starts, with where it goes: one started outright,
 * or the one for no word that the C or E key asks for when there is no cursor. `app` is the state before the action.
 */
export function flashcardStartedBy(
  app: AppState,
  action: AppAction,
): { flashcard: NewFlashcard; destination: FlashcardDestination } | null {
  if (action.type === "flashcardStarted") return action;
  if (action.type !== "lookupCursorFlashcardRequested") return null;
  const hasCursor = mediaScreenOf(app)?.screen.lookup.cursor != null;
  return hasCursor || action.wordless === null
    ? null
    : { flashcard: action.wordless, destination: action.destination };
}
