import type { AppAction } from "../app/appAction.ts";
import type { Feature } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { type HistoryWrite, historyWriteOf } from "./historyWriteOf.ts";
import type { Route } from "./route.ts";
import { isSameMainScreen, scrollTargetOf } from "./route.ts";
import type { EntryState, RouteEffect } from "./routeEffect.ts";
import { pathOfRoute, routeOfPath } from "./routePath.ts";
import { destinationOf, type RouteApp } from "./updateRoute.ts";

/**
 * Whether the main screen was opened from a link, or by the app's own navigation.
 * A link is the address the app opened at, one the browser's Back or Forward returned to, or a link from outside the app.
 * Only a screen opened from a link can name something that does not exist, so only such a screen falls back to home when it is unreachable.
 */
export type RouteOrigin = "link" | "app";

/** What the app knows of the history entry it shows. */
export type RouteHistory = EntryState & {
  /**
   * Whether the app asked the history for a move and waits for it to report the location: at once after a write, or after the browser's own delay for a return.
   * Requests for other moves, and the check for an unreachable screen, wait meanwhile.
   */
  awaitsLocation: boolean;
};

/**
 * The history as a feature. It turns each request for a move into a write of the history, or a return to the previous entry,
 * and learns of each entry the history reports.
 * The first screen is the one the app opened at, and Settings opening over a screen keep its origin.
 */
export const routeHistoryFeature: Feature<RouteHistory, keyof RouteApp> = {
  initialState: { origin: "link", previousPath: null, awaitsLocation: false },
  update: (history, action, app) =>
    action.type === "locationChanged"
      ? updated(reported(history, action), ...homeInPlaceOfUnknown(action))
      : requested(history, action, app),
};

type LocationChanged = Extract<AppAction, { type: "locationChanged" }>;

/** Learns the reported entry. A move through the history counts as opened from a link, whatever the entry's state says. */
function reported(history: RouteHistory, action: LocationChanged) {
  const origin =
    action.cause === "traversal" ? "link" : (action.state?.origin ?? "link");
  return historyWith(history, {
    origin,
    previousPath: action.state?.previousPath ?? null,
    awaitsLocation: false,
  });
}

/** Writes the home screen's path in place of a reported path that names no screen. */
function homeInPlaceOfUnknown(action: LocationChanged): RouteEffect[] {
  if (routeOfPath(action.path) !== null) return [];
  const state = {
    previousPath: action.state?.previousPath ?? null,
    origin: "link",
  } as const;
  return [
    { type: "writeLocation", entry: { path: "/", state }, write: "replace" },
  ];
}

/** Writes the history for the move the action asks for, or does nothing while a return to the previous entry is on its way. */
function requested(history: RouteHistory, action: AppAction, app: RouteApp) {
  if (history.awaitsLocation) return updated(history);
  const destination = destinationOf(app, action);
  const write = historyWriteOf(
    app.route,
    destination,
    action,
    history.previousPath,
  );
  if (write === null) return updated(history);
  if (write === "back")
    return updated(historyWith(history, { ...history, awaitsLocation: true }), {
      type: "returnToPreviousLocation",
    } satisfies RouteEffect);
  const state = entryStateOf(history, write, app.route, destination, action);
  return updated(historyWith(history, { ...history, awaitsLocation: true }), {
    type: "writeLocation",
    entry: { path: pathOfRoute(destination), state },
    write,
  } satisfies RouteEffect);
}

/** Returns what to keep with a written entry: the path it follows, which a replaced entry keeps, and its origin. */
function entryStateOf(
  history: RouteHistory,
  write: Exclude<HistoryWrite, "back">,
  before: Route,
  destination: Route,
  action: AppAction,
): EntryState {
  const previousPath =
    write === "push" ? pathOfRoute(before) : history.previousPath;
  const scrollTarget = scrollTargetOf(destination);
  const origin =
    action.type === "linkOpened"
      ? "link"
      : isSameMainScreen(before, destination)
        ? history.origin
        : "app";
  return scrollTarget === undefined
    ? { previousPath, origin }
    : { previousPath, origin, scrollTarget };
}

/** Returns the history with the given fields, keeping its reference when they are unchanged. */
function historyWith(history: RouteHistory, next: RouteHistory): RouteHistory {
  return history.origin === next.origin &&
    history.previousPath === next.previousPath &&
    history.awaitsLocation === next.awaitsLocation
    ? history
    : next;
}
