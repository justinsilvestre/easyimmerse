import { unsavedWorkCount } from "../flashcards/unsavedWorkCount.ts";
import type { AppState } from "./appState.ts";
import type { PerformedEffect } from "./effect.ts";

/** Starts guarding the app's closing when unsaved work begins, and stops once none is left. */
export function closeGuardEffects(
  before: AppState,
  after: AppState,
): readonly PerformedEffect[] {
  if (before === after) return [];
  const wasActive = unsavedWorkCount(before) > 0;
  const isActive = unsavedWorkCount(after) > 0;
  return wasActive === isActive ? [] : [{ type: "guardClose", isActive }];
}
