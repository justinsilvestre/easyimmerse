import type { RootState } from "../../app/createAppStore.ts";
import type { LookupCursor, LookupState } from "./lookupState.ts";

/** Returns the dictionary pop-up's state of the media screen or the reader, or null on any other screen. */
export const selectLookup = (state: RootState): LookupState | null =>
  state.app.screen.main.kind === "media" ? state.app.screen.main.lookup : null;

/** Returns the lookup cursor of the media screen or the reader, or null when there is none. */
export const selectLookupCursor = (state: RootState): LookupCursor | null =>
  selectLookup(state)?.cursor ?? null;
