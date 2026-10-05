/** A screen that fills the window on its own. A project's open media file is kept in the store, not here. */
export type MainNavigation =
  | { screen: "home" }
  | { screen: "offline" }
  | { screen: "newProject" }
  | { screen: "project"; projectId: string }
  | { screen: "projectSettings"; projectId: string };

/**
 * Where the app is. Settings opens over a main screen, which stays mounted beneath it
 * so that going back restores it, player state included.
 */
export type Navigation =
  | MainNavigation
  | { screen: "settings"; beneath: MainNavigation };

export type NavigationAction =
  | { type: "openProject"; projectId: string }
  | { type: "openProjectSettings"; projectId: string }
  | { type: "createProject" }
  | { type: "continueOffline" }
  | { type: "goHome" }
  | { type: "openSettings" }
  | { type: "closeSettings" };

export const initialNavigation: Navigation = { screen: "home" };

export function navigate(
  current: Navigation,
  action: NavigationAction,
): Navigation {
  switch (action.type) {
    case "openProject":
      return { screen: "project", projectId: action.projectId };
    case "openProjectSettings":
      return { screen: "projectSettings", projectId: action.projectId };
    case "createProject":
      return { screen: "newProject" };
    case "continueOffline":
      return { screen: "offline" };
    case "goHome":
      return { screen: "home" };
    case "openSettings":
      return current.screen === "settings"
        ? current
        : { screen: "settings", beneath: current };
    case "closeSettings":
      return current.screen === "settings" ? current.beneath : current;
  }
}

/** The main screen to show: the current one, or the one beneath Settings. */
export function mainScreenOf(navigation: Navigation): MainNavigation {
  return navigation.screen === "settings" ? navigation.beneath : navigation;
}
