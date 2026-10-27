import type { MainRoute, Route, SettingsPage } from "./route.ts";

/**
 * The path of each main screen. A segment that starts with a colon holds the route's field of that name.
 * Paths are tried in this order, so `/projects/new` comes before `/projects/:projectId`.
 */
const mainPaths = {
  home: "/",
  offline: "/offline",
  newProject: "/projects/new",
  project: "/projects/:projectId",
  projectSettings: "/projects/:projectId/settings",
  review: "/projects/:projectId/review",
  media: "/projects/:projectId/media/:mediaFileId",
  library: "/library",
  libraryItem: "/library/items/:itemId",
  libraryManage: "/library/manage",
  libraryEdit: "/library/manage/:itemId",
} as const satisfies Record<MainRoute["screen"], string>;

/** The name of each settings page in the `settings` query parameter. */
const settingsPageNames = {
  general: "general",
  account: "account",
  dictionaries: "dictionaries",
  pairing: "pairing",
  server: "server",
  users: "users",
  linkedRemoteUsers: "linked-remote-users",
} as const satisfies Record<SettingsPage, string>;

const settingsParameter = "settings";

/**
 * Returns the path and query that name a route in the address bar.
 * Settings over a main screen add their stack of pages, bottom first, to the main screen's path as `?settings=<page>,<page>`.
 */
export function pathOfRoute(route: Route): string {
  if (route.screen !== "settings") return mainPathOf(route);
  const pages = route.pages.map((page) => settingsPageNames[page]).join(",");
  return `${mainPathOf(route.beneath)}?${settingsParameter}=${pages}`;
}

/** Returns the route that a path and query name, as `pathOfRoute` writes them, or null when they name none. Other query parameters are ignored. */
export function routeOfPath(path: string): Route | null {
  const [pathname = "", search = ""] = path.split("?", 2);
  const main = mainRouteOf(pathname);
  const pages = settingsPagesOf(search);
  if (main === null || pages === null) return null;
  const [first, ...rest] = pages;
  return first === undefined
    ? main
    : { screen: "settings", beneath: main, pages: [first, ...rest] };
}

function mainPathOf(route: MainRoute): string {
  const fields: Partial<Record<string, string>> = route;
  return mainPaths[route.screen].replace(/:(\w+)/g, (_match, name: string) =>
    encodeURIComponent(fields[name] ?? ""),
  );
}

function mainRouteOf(pathname: string): MainRoute | null {
  const segments = segmentsOf(pathname);
  if (segments === null) return null;
  for (const [screen, pattern] of Object.entries(mainPaths)) {
    const fields = fieldsMatching(segmentsOf(pattern) ?? [], segments);
    if (fields !== null) return { screen, ...fields } as MainRoute;
  }
  return null;
}

/** Returns the fields that the pattern's parameters capture from the segments, or null when the segments do not match it. */
function fieldsMatching(
  pattern: readonly string[],
  segments: readonly string[],
): Record<string, string> | null {
  if (pattern.length !== segments.length) return null;
  const fields: Record<string, string> = {};
  for (const [index, part] of pattern.entries()) {
    const segment = segments[index] ?? "";
    if (part.startsWith(":")) fields[part.slice(1)] = segment;
    else if (part !== segment) return null;
  }
  return fields;
}

/** Splits a path into its decoded segments, or returns null when one cannot be decoded. */
function segmentsOf(pathname: string): string[] | null {
  const segments = pathname.split("/").filter((segment) => segment !== "");
  const decoded = segments.map(decodedOrNull);
  return decoded.every((segment) => segment !== null) ? decoded : null;
}

/** Returns the settings pages a query names, an empty list when it names none, or null when it names a page that does not exist. */
function settingsPagesOf(search: string): SettingsPage[] | null {
  const prefix = `${settingsParameter}=`;
  const pair = search.split("&").find((each) => each.startsWith(prefix));
  if (pair === undefined) return [];
  const names = decodedOrNull(pair.slice(prefix.length))?.split(",") ?? [""];
  const pages = names.map(settingsPageNamed);
  return pages.every((page) => page !== null) ? pages : null;
}

function settingsPageNamed(name: string): SettingsPage | null {
  const entry = Object.entries(settingsPageNames).find(
    ([, pageName]) => pageName === name,
  );
  return entry === undefined ? null : (entry[0] as SettingsPage);
}

function decodedOrNull(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}
