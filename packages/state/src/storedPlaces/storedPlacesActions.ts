import type { ReaderLocation } from "./readingLocation.ts";

export const storedPlacesActions = {
  readingLocationLoadRequested: (mediaFileId: string) =>
    ({ type: "readingLocationLoadRequested", mediaFileId }) as const,
  readingLocationLoaded: (
    mediaFileId: string,
    location: ReaderLocation | null,
  ) => ({ type: "readingLocationLoaded", mediaFileId, location }) as const,
  readingLocationReported: (mediaFileId: string, location: ReaderLocation) =>
    ({ type: "readingLocationReported", mediaFileId, location }) as const,
  playbackPositionLoadRequested: (mediaFileId: string) =>
    ({ type: "playbackPositionLoadRequested", mediaFileId }) as const,
  playbackPositionLoaded: (mediaFileId: string, ms: number | null) =>
    ({ type: "playbackPositionLoaded", mediaFileId, ms }) as const,
};

export type StoredPlacesAction = ReturnType<
  (typeof storedPlacesActions)[keyof typeof storedPlacesActions]
>;

export type StoredPlacesEffect =
  | { type: "loadReadingLocation"; mediaFileId: string }
  | {
      type: "saveReadingLocation";
      mediaFileId: string;
      location: ReaderLocation;
    }
  | { type: "loadPlaybackPosition"; mediaFileId: string }
  | { type: "savePlaybackPosition"; mediaFileId: string; ms: number };
