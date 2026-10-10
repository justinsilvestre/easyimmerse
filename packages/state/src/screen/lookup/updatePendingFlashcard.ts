import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import { lookupFlashcardFinishedBy } from "./lookupFlashcardFinishedBy.ts";
import { lookupTimerIds } from "./lookupIds.ts";
import { type LookupStep, setAside } from "./lookupMoves.ts";
import type { LookupState } from "./lookupState.ts";

const cancelWait: Effect = {
  type: "cancelTimer",
  id: lookupTimerIds.flashcardWait,
};

/**
 * Hands over the flashcard waiting for its word's lookup once the lookup's fields are written or the wait runs out,
 * setting the pop-up aside for it; the flashcards take it from there.
 */
export function updatePendingFlashcard(
  lookup: LookupState,
  action: AppAction,
  app: AppState,
): LookupStep {
  const finished = lookupFlashcardFinishedBy(app, action);
  if (finished === null || finished.pending !== lookup.pendingFlashcard)
    return [lookup, []];
  const [aside, effects] = setAside({ ...lookup, pendingFlashcard: null });
  return [aside, finished.how === "ready" ? [cancelWait, ...effects] : effects];
}
