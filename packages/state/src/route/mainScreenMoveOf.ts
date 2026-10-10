import type { AppAction } from "../app/appAction.ts";
import type { MainRoute } from "./route.ts";
import { isSameMainScreen, mainScreenOf } from "./route.ts";
import { type RouteApp, routeAfter } from "./updateRoute.ts";

/** A change of main screen: to another screen, project or media file. Opening or closing Settings over it is not a move. */
export type MainScreenMove = { from: MainRoute; to: MainRoute };

/** Returns the move of the main screen that the action makes, or null when the same main screen stays. */
export function mainScreenMoveOf(
  app: RouteApp,
  action: AppAction,
): MainScreenMove | null {
  const after = routeAfter(app, action);
  return isSameMainScreen(app.route, after)
    ? null
    : { from: mainScreenOf(app.route), to: mainScreenOf(after) };
}
