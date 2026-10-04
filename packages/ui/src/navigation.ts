/**
 * A screen that fills the window on its own. A project's open media file is kept in the store,
 * so the project screen shows the media screen while one is open.
 */
export type MainNavigation =
  | { screen: "home" }
  | { screen: "newProject" }
  | { screen: "project"; projectId: string }
  | { screen: "projectSettings"; projectId: string }
  | { screen: "offline" };

/** A screen that opens over a main screen, such as Settings. */
export type Overlay = "settings" | "dictionaries";

/**
 * Where the app is. An overlay opens over a main screen, which stays mounted beneath it
 * so that going back restores it, player state included.
 */
export type Navigation =
  | MainNavigation
  | { screen: Overlay; beneath: MainNavigation };

export type NavigationAction =
  | { type: "goHome" }
  | { type: "createProject" }
  | { type: "openProject"; projectId: string }
  | { type: "editProjectSettings"; projectId: string }
  | { type: "continueOffline" }
  | { type: "openOverlay"; overlay: Overlay }
  | { type: "closeOverlay" };

export const initialNavigation: Navigation = { screen: "home" };

export function navigate(
  current: Navigation,
  action: NavigationAction,
): Navigation {
  switch (action.type) {
    case "goHome":
      return { screen: "home" };
    case "createProject":
      return { screen: "newProject" };
    case "openProject":
      return { screen: "project", projectId: action.projectId };
    case "editProjectSettings":
      return { screen: "projectSettings", projectId: action.projectId };
    case "continueOffline":
      return { screen: "offline" };
    case "openOverlay":
      return { screen: action.overlay, beneath: mainScreenOf(current) };
    case "closeOverlay":
      return isOverlay(current) ? current.beneath : current;
  }
}

/** The main screen to show: the current one, or the one beneath an overlay. */
export function mainScreenOf(navigation: Navigation): MainNavigation {
  return isOverlay(navigation) ? navigation.beneath : navigation;
}

function isOverlay(
  navigation: Navigation,
): navigation is { screen: Overlay; beneath: MainNavigation } {
  return "beneath" in navigation;
}
