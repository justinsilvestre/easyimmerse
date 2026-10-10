import type { ReaderLocation } from "./readingLocation.ts";

/** The action creators that report the places to resume from, as loaded and as the reader moves on. */
export const storedPlacesActions = {
  readingLocationLoaded: (
    mediaFileId: string,
    location: ReaderLocation | null,
  ) => ({ type: "readingLocationLoaded", mediaFileId, location }) as const,
  readingLocationReported: (mediaFileId: string, location: ReaderLocation) =>
    ({ type: "readingLocationReported", mediaFileId, location }) as const,
  playbackPositionLoaded: (mediaFileId: string, ms: number | null) =>
    ({ type: "playbackPositionLoaded", mediaFileId, ms }) as const,
};

/** An action of the stored places. */
export type StoredPlacesAction = ReturnType<
  (typeof storedPlacesActions)[keyof typeof storedPlacesActions]
>;
