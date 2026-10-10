import type { ReaderLocation } from "./readingLocation.ts";

/**
 * Device-local places to resume from, by media file id, read from the preference store when a file opens.
 * To do: these belong on the media file record on the backend, beside the saved track selection, so that they
 * follow the user between devices; once they move there, this slice goes and components read them from the cache.
 */
export type StoredPlacesState = {
  /** The last reading place in each book: null when none is stored, absent until the stored place has been read. */
  reading: Partial<Record<string, ReaderLocation | null>>;
  /** Where playback last was in each media file, in milliseconds: null when never played, absent until read. */
  playback: Partial<Record<string, number | null>>;
};

/** The stored places before any have been read. */
export const initialStoredPlaces: StoredPlacesState = {
  reading: {},
  playback: {},
};
