import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import {
  isLeavingScreen,
  mediaScreenOf,
} from "../../flashcards/flashcardsOnScreen.ts";
import type { LookupFlashcardFields } from "../../flashcards/lookupFields.ts";
import { lookupRequestId } from "./lookupIds.ts";
import { showsOccurrence } from "./lookupMoves.ts";
import type { LookupState, PendingFlashcard } from "./lookupState.ts";
import { requestedFlashcard } from "./startFlashcard.ts";

/**
 * A flashcard from a word that no longer waits for the word's lookup:
 * - `ready`: the lookup has answered or failed, or there was nothing to look up, and `fields` are what it fills;
 * - `late`: the wait ran out first;
 * - `abandoned`: the screen was left first, or the pop-up moved on from the word, as when it closed or another word was chosen.
 */
export type FinishedLookupFlashcard = {
  pending: PendingFlashcard;
  how: "ready" | "late" | "abandoned";
  fields: LookupFlashcardFields | null;
};

/**
 * Names the moment a flashcard from a word stops waiting for its lookup, for the lookup, the form and the flashcards alike:
 * when the fields of its lookup are written, when its wait runs out, when the screen is left or the pop-up drops it,
 * or at once when no dictionary covers the word's language.
 */
export function lookupFlashcardFinishedBy(
  app: AppState,
  action: AppAction,
): FinishedLookupFlashcard | null {
  const lookup = mediaScreenOf(app)?.screen.lookup;
  if (!lookup) return null;
  const requested = requestedFlashcard(lookup, action, app);
  if (requested?.chosen.word.query === null)
    return { pending: requested, how: "ready", fields: null };
  const pending = lookup.pendingFlashcard;
  if (pending === null) return null;
  if (isLeavingScreen(app, action) || dropsPending(lookup, action))
    return { pending, how: "abandoned", fields: null };
  if (
    action.type === "flashcardFieldsWritten" &&
    action.requestId === lookupRequestId(pending.flashcardId)
  )
    return { pending, how: "ready", fields: action.fields };
  return action.type === "lookupFlashcardWaitEnded" &&
    action.flashcardId === pending.flashcardId
    ? { pending, how: "late", fields: null }
    : null;
}

/** Tells whether `updateLookup` drops the waiting flashcard on this action, by closing the pop-up, moving it to another word or starting another flashcard. */
function dropsPending(lookup: LookupState, action: AppAction): boolean {
  switch (action.type) {
    case "lookupWordClicked":
      return (
        action.input === "keyboard" || !showsOccurrence(lookup, action.chosen)
      );
    case "lookupCursorLookedUp":
    case "lookupSearchOpened":
    case "lookupTermSearched":
    case "lookupClosed":
    case "lookupCloseDue":
    case "lookupSetAside":
      return true;
    case "lookupFlashcardRequested":
      return action.chosen.word.query !== null;
    case "lookupCursorFlashcardRequested":
      return action.atCursor?.chosen.word.query != null;
    case "lookupPopupWordHeld":
      return lookup.popup?.chosen?.word.query != null;
    default:
      return false;
  }
}
