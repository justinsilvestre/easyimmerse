import type { NewFlashcard } from "@easyimmerse/types";
import type { AppAction } from "../app/appAction.ts";
import type { LookupState } from "../screen/lookup/lookupState.ts";
import { requestedFlashcard } from "../screen/lookup/startFlashcard.ts";
import type { FlashcardDestination } from "./flashcardActions.ts";

/**
 * The flashcard that needs no lookup an action starts, with where it goes: one started outright,
 * or the one for no word that the C or E key asks for when it starts none for the lookup cursor's word.
 */
export function flashcardStartedBy(
  lookup: LookupState,
  action: AppAction,
): { flashcard: NewFlashcard; destination: FlashcardDestination } | null {
  if (action.type === "flashcardStarted") return action;
  if (action.type !== "lookupCursorFlashcardRequested") return null;
  return action.wordless === null || requestedFlashcard(lookup, action)
    ? null
    : { flashcard: action.wordless, destination: action.destination };
}
