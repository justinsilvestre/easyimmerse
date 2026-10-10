import { selectUnsavedWorkCount } from "../flashcards/flashcardsSelectors.ts";
import type { AppState } from "./appState.ts";
import type { PerformedEffect } from "./effect.ts";

/** Starts guarding the app's closing when unsaved work begins, and stops once none is left. */
export function closeGuardEffects(
  before: AppState,
  after: AppState,
): readonly PerformedEffect[] {
  if (before === after) return [];
  // The selector remembers the count of `before` from the previous action, when that state was `after`.
  const wasActive = selectUnsavedWorkCount(before) > 0;
  const isActive = selectUnsavedWorkCount(after) > 0;
  return wasActive === isActive ? [] : [{ type: "guardClose", isActive }];
}
