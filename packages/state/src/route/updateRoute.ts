import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Feature } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { editedFlashcardRoute } from "../review/editedFlashcardRoute.ts";
import { projectOpenedByForm } from "../screen/projectForm/projectOpenedByForm.ts";
import { mediaFileOpenedBy } from "../screen/projectScreen/mediaFileOpenedBy.ts";
import { type HistoryWrite, historyWriteOf } from "./historyWriteOf.ts";
import type { MainRoute, Route } from "./route.ts";
import { initialRoute, mainScreenOf, navigate } from "./route.ts";
import type { RouteEffect } from "./routeEffect.ts";
import { pathOfRoute, routeOfPath } from "./routePath.ts";

/** Returns where the app is after an action. */
export function nextRoute(route: Route, action: AppAction): Route {
  switch (action.type) {
    case "navigated":
      return navigate(route, action.step);
    case "settingsRequested":
      return navigate(route, { type: "openSettings" });
    case "openMediaFileRequested":
    case "failedSaveOpened":
      return {
        screen: "media",
        projectId: action.projectId,
        mediaFileId: action.mediaFileId,
      };
    case "locationOpened":
    case "linkOpened":
      return routeAtPath(route, action.path);
    case "routeUnreachable":
      return withMainRoute(route, () => ({ screen: "home" }));
    case "closeMedia":
      return withMainRoute(route, (main) =>
        main.screen === "media" ? projectRouteOf(main) : main,
      );
    case "requestSettled": {
      // When the open media file is removed from its project, the project's overview shows instead.
      if (action.request.kind !== "removeMediaFile" || !action.outcome.ok)
        return route;
      const { mediaFileId } = action.request;
      return withMainRoute(route, (main) =>
        main.screen === "media" && main.mediaFileId === mediaFileId
          ? projectRouteOf(main)
          : main,
      );
    }
    default:
      return route;
  }
}

/** The part of the app state that decides where the app goes next. */
export type RouteApp = Pick<AppState, "route" | "screen">;

/**
 * Returns where the app is after an action, including the media file that a settled pick or fetch opens,
 * the project that a settled project form opens, and the media file of a card the review opens in the editor.
 */
export function routeAfter(app: RouteApp, action: AppAction): Route {
  const edited = editedFlashcardRoute(app, action);
  if (edited !== null) return withMainRoute(app.route, () => edited);
  const project = projectOpenedByForm(mainScreenOf(app.route), action);
  if (project !== null)
    return withMainRoute(app.route, () => ({
      screen: "project",
      projectId: project,
    }));
  const opened = mediaFileOpenedBy(app, action);
  return opened === null
    ? nextRoute(app.route, action)
    : withMainRoute(app.route, (main) =>
        main.screen === "project"
          ? { ...main, screen: "media", mediaFileId: opened }
          : main,
      );
}

/**
 * The route as a feature: where the app is, moved by navigation, by opening and closing media files, and by the addresses the platform shows.
 * Each move writes the browser's history as `historyWriteOf` decides.
 */
export const routeFeature: Feature<Route, keyof RouteApp | "routeHistory"> = {
  initialState: initialRoute,
  update: (route, action, app) => {
    const next = routeAfter(app, action);
    const { previousPath } = app.routeHistory;
    const write = historyWriteOf(route, next, action, previousPath);
    return updated(next, ...historyEffectsOf(write, route, next, previousPath));
  },
};

/** Returns the effects that write the history as decided: a new entry after the route left, the current entry with its previous path kept, or a return to the previous entry. */
function historyEffectsOf(
  write: HistoryWrite | null,
  before: Route,
  after: Route,
  previousPath: string | null,
): RouteEffect[] {
  if (write === null) return [];
  if (write === "back") return [{ type: "returnToPreviousLocation" }];
  const path = pathOfRoute(after);
  const entry =
    write === "push"
      ? { path, previousPath: pathOfRoute(before) }
      : { path, previousPath };
  return [{ type: "writeLocation", entry, write }];
}

/** Changes the main screen, beneath Settings when they are open, and keeps the route itself when nothing changes. */
function withMainRoute(
  route: Route,
  change: (main: MainRoute) => MainRoute,
): Route {
  if (route.screen !== "settings") return change(route);
  const beneath = change(route.beneath);
  return beneath === route.beneath ? route : { ...route, beneath };
}

/** Returns the route the path names, or home when it names none, keeping the current route itself when the path names it. */
function routeAtPath(route: Route, path: string): Route {
  const named = routeOfPath(path) ?? initialRoute;
  return pathOfRoute(named) === pathOfRoute(route) ? route : named;
}

function projectRouteOf(main: { projectId: string }): MainRoute {
  return { screen: "project", projectId: main.projectId };
}
