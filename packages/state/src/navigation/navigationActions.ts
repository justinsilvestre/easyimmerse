import type { MediaFile } from "@easyimmerse/types";

export const navigationActions = {
  homeOpened: () => ({ type: "homeOpened" }) as const,
  newProjectFormOpened: () => ({ type: "newProjectFormOpened" }) as const,
  projectOpened: (projectId: string) =>
    ({ type: "projectOpened", projectId }) as const,
  mediaOpened: (projectId: string, media: MediaFile) =>
    ({ type: "mediaOpened", projectId, media }) as const,
  /** Returns from the media screen to its project's screen. */
  mediaClosed: () => ({ type: "mediaClosed" }) as const,
};
