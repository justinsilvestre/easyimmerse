import { type AppAction, actions } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { isSameMainScreen } from "../../route/route.ts";
import { routeAfter } from "../../route/updateRoute.ts";

/** The action as the media screen sees it: `mediaScreenLeft` in place of one that moves the route away from the screen. */
export function mediaScreenActionOf(
  app: AppState,
  action: AppAction,
): AppAction {
  return isSameMainScreen(app.route, routeAfter(app, action))
    ? action
    : actions.mediaScreenLeft();
}
