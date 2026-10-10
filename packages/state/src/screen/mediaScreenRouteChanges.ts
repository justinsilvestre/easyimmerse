import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { isSameMainScreen, mainScreenOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import {
  type OpenMediaScreen,
  selectMediaScreen,
} from "./mediaScreen/mediaScreenSelectors.ts";

/** Returns the open media screen when the action's route change closes it, or null when it stays open or none is open. */
export function mediaScreenLeftBy(
  app: AppState,
  action: AppAction,
): OpenMediaScreen | null {
  const open = selectMediaScreen(app);
  return open && !isSameMainScreen(app.route, routeAfter(app, action))
    ? open
    : null;
}

/** Returns the media file whose media screen or reader the action's route change opens, or null when none opens. */
export function mediaScreenEnteredBy(
  app: AppState,
  action: AppAction,
): string | null {
  const after = routeAfter(app, action);
  const main = mainScreenOf(after);
  return main.screen === "media" && !isSameMainScreen(app.route, after)
    ? main.mediaFileId
    : null;
}
