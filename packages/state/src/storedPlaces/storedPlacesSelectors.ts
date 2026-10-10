import type { RootState } from "../app/createAppStore.ts";

/** Returns the book's last reading place, null when it has none, or undefined until its stored place has been read. */
export const selectReadingLocation =
  (mediaFileId: string) => (state: RootState) =>
    state.app.storedPlaces.reading[mediaFileId];

/** Tells whether the book's stored reading place has been read, whether or not one was stored. */
export const selectIsReadingLocationLoaded =
  (mediaFileId: string) => (state: RootState) =>
    state.app.storedPlaces.reading[mediaFileId] !== undefined;
