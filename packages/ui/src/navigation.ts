/** A screen that fills the window on its own. A project's open media file is kept in the store, not here. */
export type MainNavigation =
  | { screen: "home" }
  | { screen: "offline" }
  | { screen: "newProject" }
  | { screen: "project"; projectId: string }
  | { screen: "projectSettings"; projectId: string };

/** A page of the settings, which open over a main screen. */
export type SettingsPage = "general" | "dictionaries";

/**
 * Where the app is. Settings opens over a main screen, which stays mounted beneath it
 * so that going back restores it, player state included.
 * The settings pages form a stack: Back leaves the top page, and the last page returns to the main screen.
 */
export type Navigation =
  | MainNavigation
  | {
      screen: "settings";
      beneath: MainNavigation;
      pages: readonly [SettingsPage, ...SettingsPage[]];
    };

export type NavigationAction =
  | { type: "openProject"; projectId: string }
  | { type: "openProjectSettings"; projectId: string }
  | { type: "createProject" }
  | { type: "continueOffline" }
  | { type: "goHome" }
  | { type: "openSettings" }
  | { type: "openDictionaries" }
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
        : { screen: "settings", beneath: current, pages: ["general"] };
    case "openDictionaries":
      return openSettingsPage(current, "dictionaries");
    case "closeSettings":
      return closeSettingsPage(current);
  }
}

/** The settings page on top: the one shown. */
export function settingsPageOf(
  navigation: Extract<Navigation, { screen: "settings" }>,
): SettingsPage {
  return navigation.pages[navigation.pages.length - 1] ?? "general";
}

function openSettingsPage(current: Navigation, page: SettingsPage): Navigation {
  if (current.screen !== "settings")
    return { screen: "settings", beneath: current, pages: [page] };
  if (settingsPageOf(current) === page) return current;
  return { ...current, pages: [...current.pages, page] };
}

function closeSettingsPage(current: Navigation): Navigation {
  if (current.screen !== "settings") return current;
  const [first, ...rest] = current.pages.slice(0, -1);
  return first === undefined
    ? current.beneath
    : { ...current, pages: [first, ...rest] };
}

/** The main screen to show: the current one, or the one beneath Settings. */
export function mainScreenOf(navigation: Navigation): MainNavigation {
  return navigation.screen === "settings" ? navigation.beneath : navigation;
}
