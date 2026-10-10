import type { AppState } from "../app/appState.ts";

/** The slices of the app state that the screens' updates read, as they were before the action. */
export type ScreenApp = Pick<
  AppState,
  "route" | "screen" | "server" | "storedPlaces" | "preferences" | "operations"
>;
