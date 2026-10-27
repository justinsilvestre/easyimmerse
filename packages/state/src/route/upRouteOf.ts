import type { MainRoute, Route } from "./route.ts";
import { navigate } from "./route.ts";
import { pathOfRoute } from "./routePath.ts";

/**
 * Returns where the app's own Back control leads from a route: the settings page below the top one, or the main screen beneath the last one,
 * and otherwise the screen the main screen belongs to. The home screen belongs to none, so it returns null there.
 */
export function upRouteOf(route: Route): Route | null {
  return route.screen === "settings"
    ? navigate(route, { type: "closeSettings" })
    : parentOf(route);
}

/** Returns the path of the place the app's own Back control leads from a route, as its link names it, or null on the home screen. */
export function upPathOf(route: Route): string | null {
  const up = upRouteOf(route);
  return up === null ? null : pathOfRoute(up);
}

function parentOf(route: MainRoute): MainRoute | null {
  switch (route.screen) {
    case "home":
      return null;
    case "offline":
    case "newProject":
    case "project":
    case "library":
      return { screen: "home" };
    case "projectSettings":
    case "review":
    case "media":
      return { screen: "project", projectId: route.projectId };
    case "libraryItem":
    case "libraryManage":
      return { screen: "library" };
    case "libraryEdit":
      return { screen: "libraryManage" };
  }
}
