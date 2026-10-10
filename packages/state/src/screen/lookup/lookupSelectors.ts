import type { AppState } from "../../app/appState.ts";
import type { RootState } from "../../app/createAppStore.ts";
import { selectMediaScreen } from "../mediaScreen/mediaScreenSelectors.ts";
import type {
  LookupCursor,
  LookupState,
  PendingFlashcard,
} from "./lookupState.ts";

/** Returns the dictionary pop-up's state of the media screen or the reader, or null on any other screen. */
export const selectLookup = (state: RootState): LookupState | null =>
  state.app.screen.main.kind === "media" ? state.app.screen.main.lookup : null;

/** Returns the lookup cursor of the media screen or the reader, or null when there is none. */
export const selectLookupCursor = (state: RootState): LookupCursor | null =>
  selectLookup(state)?.cursor ?? null;

/** Returns the flashcard waiting for its word's lookup before it is saved or opened, or null. */
export function selectPendingFlashcard(
  app: Pick<AppState, "route" | "screen">,
): PendingFlashcard | null {
  return selectMediaScreen(app)?.screen.lookup.pendingFlashcard ?? null;
}
