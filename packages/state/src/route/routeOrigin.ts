import type { AppAction } from "../app/appAction.ts";
import type { Feature } from "../app/feature.ts";
import { isSameMainScreen } from "./route.ts";
import { type RouteApp, routeAfter } from "./updateRoute.ts";

/**
 * Whether the main screen was opened from a link, or by the app's own navigation.
 * A link is the address the app opened at, one the browser's Back or Forward returned to, or a link from outside the app.
 * Only a screen opened from a link can name something that does not exist, so only such a screen falls back to home when it is unreachable.
 */
export type RouteOrigin = "link" | "app";

/** The main screen's origin as a feature. The first screen is the one the app opened at, and Settings opening over a screen keep its origin. */
export const routeOriginFeature: Feature<RouteOrigin, keyof RouteApp> = {
  initialState: "link",
  update: (origin, action, app) => [originAfter(origin, action, app), []],
};

function originAfter(
  origin: RouteOrigin,
  action: AppAction,
  app: RouteApp,
): RouteOrigin {
  if (action.type === "locationOpened" || action.type === "linkOpened")
    return "link";
  return isSameMainScreen(app.route, routeAfter(app, action)) ? origin : "app";
}
