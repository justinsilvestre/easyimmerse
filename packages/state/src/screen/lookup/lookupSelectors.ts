import type { RootState } from "../../app/createAppStore.ts";
import type { LookupState, PendingFlashcard } from "./lookupState.ts";

/** Returns the dictionary pop-up's state of the media screen or the reader, or null on any other screen. */
export const selectLookup = (state: RootState): LookupState | null =>
  state.app.screen.main.kind === "media" ? state.app.screen.main.lookup : null;

/** Returns the flashcard started from a word that no longer waits for the word's lookup, or null when there is none. */
export const selectFinishedLookupFlashcard = (
  state: RootState,
): PendingFlashcard | null => {
  const pending = selectLookup(state)?.pendingFlashcard ?? null;
  return pending?.stage === "waiting" ? null : pending;
};
