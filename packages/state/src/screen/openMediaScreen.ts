import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { isSameMainScreen, mainScreenOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import type { PlayerState } from "./mediaScreen/playerState.ts";

/** The media screen open on the main screen, with the id of its media file. */
export type OpenMediaScreen = { mediaFileId: string; player: PlayerState };

/** Returns the media screen open on the main screen, or null when another screen is there. */
export function openMediaScreen(app: AppState): OpenMediaScreen | null {
  const route = mainScreenOf(app.route);
  const main = app.screen.main;
  return route.screen === "media" && main.kind === "media"
    ? { mediaFileId: route.mediaFileId, player: main.player }
    : null;
}

/** Returns the open media screen when the action's route change closes it, or null when it stays open or none is open. */
export function mediaScreenLeftBy(
  app: AppState,
  action: AppAction,
): OpenMediaScreen | null {
  const open = openMediaScreen(app);
  return open && !isSameMainScreen(app.route, routeAfter(app, action))
    ? open
    : null;
}
