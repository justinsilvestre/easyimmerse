import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import {
  isLeavingScreen,
  mediaScreenOf,
} from "../../flashcards/flashcardsOnScreen.ts";
import type { LookupFlashcardFields } from "../../flashcards/lookupFields.ts";
import { lookupRequestId } from "./lookupIds.ts";
import type { PendingFlashcard } from "./lookupState.ts";
import { requestedFlashcard } from "./startFlashcard.ts";

/**
 * A flashcard from a word that no longer waits for the word's lookup:
 * - `ready`: the lookup has answered or failed, or there was nothing to look up, and `fields` are what it fills;
 * - `late`: the wait ran out first;
 * - `left`: the screen was left first.
 */
export type FinishedLookupFlashcard = {
  pending: PendingFlashcard;
  how: "ready" | "late" | "left";
  fields: LookupFlashcardFields | null;
};

/**
 * Names the moment a flashcard from a word stops waiting for its lookup, for the lookup, the form and the flashcards alike:
 * when the fields of its lookup are written, when its wait runs out, when the screen is left,
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
  if (isLeavingScreen(app, action))
    return { pending, how: "left", fields: null };
  if (
    action.type === "flashcardFieldsWritten" &&
    action.requestId === lookupRequestId(pending.sequence)
  )
    return { pending, how: "ready", fields: action.fields };
  return action.type === "lookupFlashcardWaitEnded" &&
    action.sequence === pending.sequence
    ? { pending, how: "late", fields: null }
    : null;
}
