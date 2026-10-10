import type { ReaderLocation } from "./readingLocation.ts";

/** The side effects of the stored places: reading and saving them in the preference store. */
export type StoredPlacesEffect =
  | { type: "loadReadingLocation"; mediaFileId: string }
  | {
      type: "saveReadingLocation";
      mediaFileId: string;
      location: ReaderLocation;
    }
  | { type: "loadPlaybackPosition"; mediaFileId: string }
  | { type: "savePlaybackPosition"; mediaFileId: string; ms: number };
