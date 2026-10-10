/** A screen that fills the window on its own. */
export type MainRoute =
  | { screen: "home" }
  | { screen: "offline" }
  | { screen: "newProject" }
  | { screen: "project"; projectId: string }
  | { screen: "projectSettings"; projectId: string }
  /** A media file of a project, shown on the media screen or, for a book, in the reader. */
  | { screen: "media"; projectId: string; mediaFileId: string };

/** A page of the settings, which open over a main screen. */
export type SettingsPage = "general" | "dictionaries";

/**
 * Where the app is. Settings opens over a main screen, which stays mounted beneath it so that going back restores it, player state included.
 * The settings pages form a stack: Back leaves the top page, and the last page returns to the main screen.
 * A library router is planned; it will own history, links and deep links, and this value will then be fed from it or replaced by it.
 */
export type Route =
  | MainRoute
  | {
      screen: "settings";
      beneath: MainRoute;
      pages: readonly [SettingsPage, ...SettingsPage[]];
    };

/** A move from one place in the app to another. */
export type NavigationStep =
  | { type: "openProject"; projectId: string }
  | { type: "openProjectSettings"; projectId: string }
  | { type: "createProject" }
  | { type: "continueOffline" }
  | { type: "goHome" }
  | { type: "openSettings" }
  | { type: "openDictionaries" }
  | { type: "closeSettings" };

export const initialRoute: Route = { screen: "home" };

/** Returns where the app is after taking a step from the current place. */
export function navigate(current: Route, step: NavigationStep): Route {
  switch (step.type) {
    case "openProject":
      return { screen: "project", projectId: step.projectId };
    case "openProjectSettings":
      return { screen: "projectSettings", projectId: step.projectId };
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

/** Returns the settings page on top of the stack, which is the one shown. */
export function settingsPageOf(
  route: Extract<Route, { screen: "settings" }>,
): SettingsPage {
  return route.pages[route.pages.length - 1] ?? "general";
}

function openSettingsPage(current: Route, page: SettingsPage): Route {
  if (current.screen !== "settings")
    return { screen: "settings", beneath: current, pages: [page] };
  if (settingsPageOf(current) === page) return current;
  return { ...current, pages: [...current.pages, page] };
}

function closeSettingsPage(current: Route): Route {
  if (current.screen !== "settings") return current;
  const [first, ...rest] = current.pages.slice(0, -1);
  return first === undefined
    ? current.beneath
    : { ...current, pages: [first, ...rest] };
}

/** The main screen to show: the current one, or the one beneath Settings. */
export function mainScreenOf(route: Route): MainRoute {
  return route.screen === "settings" ? route.beneath : route;
}

/** Tells whether two routes show the same main screen for the same project and media file. Settings over it do not count. */
export function isSameMainScreen(before: Route, after: Route): boolean {
  const [a, b] = [
    identify(mainScreenOf(before)),
    identify(mainScreenOf(after)),
  ];
  return a.every((part, index) => part === b[index]);
}

function identify(route: MainRoute): readonly (string | null)[] {
  return [
    route.screen,
    "projectId" in route ? route.projectId : null,
    "mediaFileId" in route ? route.mediaFileId : null,
  ];
}
