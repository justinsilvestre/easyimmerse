import type { AppState } from "../../app/appState.ts";
import type { FlashcardForm } from "../../flashcards/flashcardForm.ts";
import type { MediaRoute } from "../../route/route.ts";
import { mainScreenOf } from "../../route/route.ts";
import type { OpenMediaScreen } from "../openMediaScreen.ts";
import type { MediaScreenState } from "../screenState.ts";

/** The app state that the media screen selectors read. */
type MediaScreenApp = Pick<AppState, "route" | "screen">;

/** Returns the open media screen or reader, with its route, or null on any other screen. */
export function selectMediaScreen(
  app: MediaScreenApp,
): { screen: MediaScreenState; route: MediaRoute } | null {
  const route = mainScreenOf(app.route);
  const screen = app.screen.main;
  return screen.kind === "media" && route.screen === "media"
    ? { screen, route }
    : null;
}

/**
 * Returns the media screen the app shows, for the media screen's own updates, which run only while it is shown.
 * It throws on any other screen.
 */
export function selectShownMediaScreen(app: MediaScreenApp): MediaScreenState {
  const onScreen = selectMediaScreen(app);
  if (onScreen === null) throw new Error("No media screen is shown.");
  return onScreen.screen;
}

/** Returns the media file the shown media screen plays, with its project, as `selectShownMediaScreen` describes. */
export function selectShownMediaFile(app: Pick<AppState, "route">): MediaRoute {
  const route = mainScreenOf(app.route);
  if (route.screen !== "media") throw new Error("No media screen is shown.");
  return route;
}

/** Returns the media screen open on the main screen, with the id of its media file, or null when another screen is there. */
export function selectOpenMediaScreen(
  app: MediaScreenApp,
): OpenMediaScreen | null {
  const route = mainScreenOf(app.route);
  const main = app.screen.main;
  return route.screen === "media" && main.kind === "media"
    ? { mediaFileId: route.mediaFileId, player: main.playing.player }
    : null;
}

/** Returns the flashcard open in the form, or null. */
export function selectFlashcardForm(app: MediaScreenApp): FlashcardForm | null {
  return selectMediaScreen(app)?.screen.flashcardForm ?? null;
}
