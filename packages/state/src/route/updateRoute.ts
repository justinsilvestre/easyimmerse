import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Feature } from "../app/feature.ts";
import { projectOpenedByForm } from "../screen/projectForm/projectOpenedByForm.ts";
import { mediaFileOpenedBy } from "../screen/projectScreen/mediaFileOpenedBy.ts";
import type { MainRoute, Route } from "./route.ts";
import { initialRoute, mainScreenOf, navigate } from "./route.ts";

/** Returns where the app is after an action. */
export function nextRoute(route: Route, action: AppAction): Route {
  switch (action.type) {
    case "navigated":
      return navigate(route, action.step);
    case "settingsRequested":
      return navigate(route, { type: "openSettings" });
    case "openMediaFileRequested":
      return {
        screen: "media",
        projectId: action.projectId,
        mediaFileId: action.mediaFileId,
      };
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

/**
 * Returns where the app is after an action, including the media file that a settled pick or fetch opens,
 * and the project that a settled project form opens.
 */
export function routeAfter(app: AppState, action: AppAction): Route {
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

/** The route as a feature: where the app is, moved by navigation and by opening and closing media files. */
export const routeFeature: Feature<Route> = {
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

function projectRouteOf(main: { projectId: string }): MainRoute {
  return { screen: "project", projectId: main.projectId };
}
