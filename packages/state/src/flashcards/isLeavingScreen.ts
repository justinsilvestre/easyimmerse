import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { isSameMainScreen } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import { selectMediaScreen } from "../screen/mediaScreen/mediaScreenSelectors.ts";

/** Tells whether the action leaves the open media screen or reader for another main screen. */
export function isLeavingScreen(app: AppState, action: AppAction): boolean {
  return (
    selectMediaScreen(app) !== null &&
    !isSameMainScreen(app.route, routeAfter(app, action))
  );
}
