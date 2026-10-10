import type { AppState } from "../app/appState.ts";

/** The slices of the app state that the flashcard rules read: the requests, the route and the open form. */
export type FlashcardApp = Pick<AppState, "operations" | "route" | "screen">;
