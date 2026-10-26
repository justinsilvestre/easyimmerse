import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Feature } from "../app/feature.ts";
import { editedFlashcardRoute } from "../review/editedFlashcardRoute.ts";
import { projectOpenedByForm } from "../screen/projectForm/projectOpenedByForm.ts";
import { mediaFileOpenedBy } from "../screen/projectScreen/mediaFileOpenedBy.ts";
import type { MainRoute, Route, SettingsSection } from "./route.ts";
import { initialRoute, isSamePlace, mainScreenOf, navigate } from "./route.ts";
import { routeOfPath } from "./routePath.ts";

/** Returns where a request asks the app to go from the route, which is the route itself for an action that asks for no move. */
export function requestedRoute(route: Route, action: AppAction): Route {
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
 * Returns where an action asks the app to go, including the media file that a settled pick or fetch opens,
 * the project that a settled project form opens, and the media file of a card the review opens in the editor.
 * It is the route itself for an action that asks for no move. The app goes there once the history reports the location.
 */
export function destinationOf(app: RouteApp, action: AppAction): Route {
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
    ? requestedRoute(app.route, action)
    : withMainRoute(app.route, (main) =>
        main.screen === "project"
          ? { ...main, screen: "media", mediaFileId: opened }
          : main,
      );
}

/**
 * Returns where the app is after an action. Only a reported location moves it, to the screen the location names, or home when it names none;
 * the route keeps its reference when the location names it already.
 */
export function routeAfter(
  app: Pick<RouteApp, "route">,
  action: AppAction,
): Route {
  return action.type === "locationChanged"
    ? routeAtLocation(app.route, action.path, action.state?.scrollTarget)
    : app.route;
}

/** The route as a feature: where the app is, which moves only when the history reports a location. */
export const routeFeature: Feature<Route, "route"> = {
  initialState: initialRoute,
  update: (_route, action, app) => [routeAfter(app, action), []],
};

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
  return routeAtLocation(route, path, undefined);
}

/** Returns the route a location names, with the settings section its entry scrolls to, keeping the current route itself when they name it. */
function routeAtLocation(
  route: Route,
  path: string,
  scrollTarget: SettingsSection | undefined,
): Route {
  const named = routeOfPath(path) ?? initialRoute;
  const located =
    named.screen === "settings" && scrollTarget !== undefined
      ? { ...named, scrollTarget }
      : named;
  return isSamePlace(located, route) ? route : located;
}

function projectRouteOf(main: { projectId: string }): MainRoute {
  return { screen: "project", projectId: main.projectId };
}
