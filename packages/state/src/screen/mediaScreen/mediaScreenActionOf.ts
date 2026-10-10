import { type AppAction, actions } from "../../app/appAction.ts";
import { mainScreenMoveOf } from "../../route/mainScreenMoveOf.ts";
import type { RouteApp } from "../../route/updateRoute.ts";

/** The action as the media screen sees it: `mediaScreenLeft` in place of one that moves the route away from the screen. */
export function mediaScreenActionOf(
  app: RouteApp,
  action: AppAction,
): AppAction {
  return mainScreenMoveOf(app, action) !== null
    ? actions.mediaScreenLeft()
    : action;
}
