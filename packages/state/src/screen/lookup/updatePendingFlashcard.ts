import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import { lookupFlashcardFinishedBy } from "./lookupFlashcardFinishedBy.ts";
import { lookupTimerIds } from "./lookupIds.ts";
import { setAside } from "./lookupMoves.ts";
import type { LookupState } from "./lookupState.ts";

const cancelWait = {
  type: "cancelTimer",
  id: lookupTimerIds.flashcardWait,
} satisfies Effect;

/**
 * Hands over the flashcard waiting for its word's lookup once the lookup's fields are written or the wait runs out,
 * setting the pop-up aside for it; the flashcards take it from there.
 */
export function updatePendingFlashcard(
  lookup: LookupState,
  action: AppAction,
  app: AppState,
) {
  const finished = lookupFlashcardFinishedBy(app, action);
  if (finished === null || finished.pending !== lookup.pendingFlashcard)
    return updated(lookup);
  const [aside, effects] = setAside({ ...lookup, pendingFlashcard: null });
  return finished.how === "ready"
    ? updated(aside, cancelWait, ...effects)
    : updated(aside, ...effects);
}
