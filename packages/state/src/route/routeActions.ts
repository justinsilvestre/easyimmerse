import type { NavigationStep } from "./route.ts";

/** The action creators that move the app from one place to another. */
export const routeActions = {
  /** Takes a step from where the app is to another place. */
  navigated: (step: NavigationStep) => ({ type: "navigated", step }) as const,
  /** Opens a media file of a project on its media screen, from wherever the app is. */
  openMediaFileRequested: (projectId: string, mediaFileId: string) =>
    ({ type: "openMediaFileRequested", projectId, mediaFileId }) as const,
  /** The platform asked for the Settings screen, as a desktop menu item does. */
  settingsRequested: () => ({ type: "settingsRequested" }) as const,
  /** Leaves the open media file for its project's overview. */
  closeMedia: () => ({ type: "closeMedia" }) as const,
  /**
   * The platform shows an address, path and query: the one the app opened at, or one the browser's Back or Forward returned to,
   * with the path of the history entry before it, when the app wrote that entry.
   * The app moves to the screen it names, or to the home screen when it names none.
   */
  locationOpened: (path: string, previousPath: string | null = null) =>
    ({ type: "locationOpened", path, previousPath }) as const,
  /**
   * Opens the screen that a link's path and query name, as a new step from where the app is, or the home screen when they name none.
   * A link from outside the app, such as an `easyimmerse://` link, opens through this action.
   */
  linkOpened: (path: string) => ({ type: "linkOpened", path }) as const,
  /** The screen a link opened turned out to be one the app cannot reach, so the home screen takes its place. */
  routeUnreachable: () => ({ type: "routeUnreachable" }) as const,
};

/** An action that moves the app from one place to another. */
export type RouteAction = ReturnType<
  (typeof routeActions)[keyof typeof routeActions]
>;
