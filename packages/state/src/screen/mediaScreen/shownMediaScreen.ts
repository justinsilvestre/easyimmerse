import { type AppAction, actions } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { mediaScreenOf } from "../../flashcards/flashcardsOnScreen.ts";
import type { MediaRoute } from "../../route/route.ts";
import { isSameMainScreen, mainScreenOf } from "../../route/route.ts";
import { routeAfter } from "../../route/updateRoute.ts";
import type { MediaScreenState } from "../screenState.ts";

/**
 * The media screen the app shows, for the media screen's own updates, which run only while it is shown.
 * It throws on any other screen.
 */
export function shownMediaScreen(app: AppState): MediaScreenState {
  return shown(app).screen;
}

/** The media file the shown media screen plays, with its project, as `shownMediaScreen` describes. */
export function shownMediaFile(app: Pick<AppState, "route">): MediaRoute {
  const route = mainScreenOf(app.route);
  if (route.screen !== "media") throw new Error("No media screen is shown.");
  return route;
}

/** The action as the media screen sees it: `mediaScreenLeft` in place of one that moves the route away from the screen. */
export function mediaScreenActionOf(
  app: AppState,
  action: AppAction,
): AppAction {
  return isSameMainScreen(app.route, routeAfter(app, action))
    ? action
    : actions.mediaScreenLeft();
}

function shown(app: AppState) {
  const onScreen = mediaScreenOf(app);
  if (onScreen === null) throw new Error("No media screen is shown.");
  return onScreen;
}
