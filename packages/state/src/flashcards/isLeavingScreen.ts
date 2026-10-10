import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { MediaRoute } from "../route/route.ts";
import { isSameMainScreen, mainScreenOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import type { PendingFlashcard } from "../screen/lookup/lookupState.ts";
import type { MediaScreenState } from "../screen/screenState.ts";
import type { FlashcardForm } from "./flashcardForm.ts";

/** The open media screen or reader, with its route, or null on any other screen. */
export function mediaScreenOf(
  app: AppState,
): { screen: MediaScreenState; route: MediaRoute } | null {
  const route = mainScreenOf(app.route);
  const screen = app.screen.main;
  return screen.kind === "media" && route.screen === "media"
    ? { screen, route }
    : null;
}

/** The flashcard open in the form, or null. */
export function formOf(app: AppState): FlashcardForm | null {
  return mediaScreenOf(app)?.screen.flashcardForm ?? null;
}

/** The flashcard waiting for its word's lookup before it is saved or opened, or null. */
export function pendingFlashcardOf(app: AppState): PendingFlashcard | null {
  return mediaScreenOf(app)?.screen.lookup.pendingFlashcard ?? null;
}

/** Tells whether the action leaves the open media screen or reader for another main screen. */
export function isLeavingScreen(app: AppState, action: AppAction): boolean {
  return (
    mediaScreenOf(app) !== null &&
    !isSameMainScreen(app.route, routeAfter(app, action))
  );
}
