import type { NavigationStep } from "./route.ts";
import type { EntryState, LocationCause } from "./routeEffect.ts";

/**
 * The action creators that move the app from one place to another.
 * Each one but `locationChanged` asks for a move, which the history performs; the app then moves when the history reports the location.
 */
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
   * The platform reports the location: after one of the app's own writes, at startup, or after the browser's Back or Forward.
   * The app moves to the screen it names, or to the home screen when it names none. This is the only action that moves the app.
   */
  locationChanged: (
    path: string,
    state: EntryState | null = null,
    cause: LocationCause = "traversal",
  ) => ({ type: "locationChanged", path, state, cause }) as const,
  /**
   * Asks to open the screen that a link's path and query name, as a new step from where the app is, or the home screen when they name none.
   * A link from outside the app, such as an `easyimmerse://` link, opens through this action.
   */
  linkOpened: (path: string) => ({ type: "linkOpened", path }) as const,
  /**
   * A person followed one of the app's own links within the app, which asks to open the screen its path and query name, or the home screen when they name none.
   * It moves as the app's own navigation does, so a link to the screen the current one belongs to returns to the previous entry when that entry is its target.
   */
  linkFollowed: (path: string) => ({ type: "linkFollowed", path }) as const,
  /** The screen a link opened turned out to be one the app cannot reach, so the home screen takes its place. */
  routeUnreachable: () => ({ type: "routeUnreachable" }) as const,
};

/** An action that moves the app from one place to another. */
export type RouteAction = ReturnType<
  (typeof routeActions)[keyof typeof routeActions]
>;
