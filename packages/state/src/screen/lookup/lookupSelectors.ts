import type { AppState } from "../../app/appState.ts";
import { selectMediaScreen } from "../mediaScreen/mediaScreenSelectors.ts";
import type {
  LookupCursor,
  LookupState,
  PendingFlashcard,
} from "./lookupState.ts";

/** Returns the dictionary pop-up's state of the media screen or the reader, or null on any other screen. */
export function selectLookup(
  app: Pick<AppState, "screen">,
): LookupState | null {
  return app.screen.main.kind === "media" ? app.screen.main.lookup : null;
}

/** Returns the lookup cursor of the media screen or the reader, or null when there is none. */
export function selectLookupCursor(
  app: Pick<AppState, "screen">,
): LookupCursor | null {
  return selectLookup(app)?.cursor ?? null;
}

/** Returns the flashcard waiting for its word's lookup before it is saved or opened, or null. */
export function selectPendingFlashcard(
  app: Pick<AppState, "route" | "screen">,
): PendingFlashcard | null {
  return selectMediaScreen(app)?.screen.lookup.pendingFlashcard ?? null;
}
