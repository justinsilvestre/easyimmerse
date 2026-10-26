import type { AppAction } from "../app/appAction.ts";
import type { Feature } from "../app/feature.ts";
import { type HistoryWrite, historyWriteOf } from "./historyWriteOf.ts";
import type { Route } from "./route.ts";
import { isSameMainScreen } from "./route.ts";
import { pathOfRoute } from "./routePath.ts";
import { type RouteApp, routeAfter } from "./updateRoute.ts";

/**
 * Whether the main screen was opened from a link, or by the app's own navigation.
 * A link is the address the app opened at, one the browser's Back or Forward returned to, or a link from outside the app.
 * Only a screen opened from a link can name something that does not exist, so only such a screen falls back to home when it is unreachable.
 */
export type RouteOrigin = "link" | "app";

/** What the app knows of how it reached the current route. */
export type RouteHistory = {
  origin: RouteOrigin;
  /**
   * The path of the browser's history entry before the current one, as the app wrote it, or null when the app does not know it,
   * as for the first entry it wrote in a tab, on a platform that keeps no history, or while a return to the previous entry is on its way.
   */
  previousPath: string | null;
};

/** The route's history as a feature. The first screen is the one the app opened at, and Settings opening over a screen keep its origin. */
export const routeHistoryFeature: Feature<RouteHistory, keyof RouteApp> = {
  initialState: { origin: "link", previousPath: null },
  update: (history, action, app) => [historyAfter(history, action, app), []],
};

function historyAfter(
  history: RouteHistory,
  action: AppAction,
  app: RouteApp,
): RouteHistory {
  if (action.type === "locationOpened")
    return historyWith(history, "link", action.previousPath);
  const after = routeAfter(app, action);
  const write = historyWriteOf(app.route, after, action, history.previousPath);
  return historyWith(
    history,
    originAfter(history.origin, action, app.route, after),
    previousPathAfter(history.previousPath, write, app.route),
  );
}

function originAfter(
  origin: RouteOrigin,
  action: AppAction,
  before: Route,
  after: Route,
): RouteOrigin {
  if (action.type === "linkOpened") return "link";
  return isSameMainScreen(before, after) ? origin : "app";
}

function previousPathAfter(
  previousPath: string | null,
  write: HistoryWrite | null,
  before: Route,
): string | null {
  if (write === "push") return pathOfRoute(before);
  if (write === "back") return null;
  return previousPath;
}

/** Returns the history with the given fields, keeping its reference when they are unchanged. */
function historyWith(
  history: RouteHistory,
  origin: RouteOrigin,
  previousPath: string | null,
): RouteHistory {
  return history.origin === origin && history.previousPath === previousPath
    ? history
    : { origin, previousPath };
}
