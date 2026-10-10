import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Feature } from "../app/feature.ts";
import { mediaFileOpenedBy } from "../screen/projectScreen/mediaFileOpenedBy.ts";
import type { MainRoute, Route } from "./route.ts";
import { initialRoute, navigate } from "./route.ts";

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
    case "mediaFileRemoved":
      return withMainRoute(route, (main) =>
        main.screen === "media" && main.mediaFileId === action.mediaFileId
          ? projectRouteOf(main)
          : main,
      );
    default:
      return route;
  }
}

/** Returns where the app is after an action, including the media file that a settled pick or fetch opens. */
export function routeAfter(app: AppState, action: AppAction): Route {
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
