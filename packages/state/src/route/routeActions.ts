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
  /** A media file was removed from its project; if it was open, its project's overview shows instead. */
  mediaFileRemoved: (mediaFileId: string) =>
    ({ type: "mediaFileRemoved", mediaFileId }) as const,
};

/** An action that moves the app from one place to another. */
export type RouteAction = ReturnType<
  (typeof routeActions)[keyof typeof routeActions]
>;
