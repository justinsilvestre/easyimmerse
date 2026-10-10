import type { NavigationStep } from "./route.ts";

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
  /** A picked media file was added to the open project, which then opens it. */
  mediaFileAdded: (mediaFileId: string) =>
    ({ type: "mediaFileAdded", mediaFileId }) as const,
  mediaFileRemoved: (mediaFileId: string) =>
    ({ type: "mediaFileRemoved", mediaFileId }) as const,
};

export type RouteAction = ReturnType<
  (typeof routeActions)[keyof typeof routeActions]
>;
