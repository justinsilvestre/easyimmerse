import type { AppRoot } from "../app/createAppStore.ts";

/** Tells whether the book's stored reading place has been read, whether or not one was stored. */
export const selectIsReadingLocationLoaded =
  (mediaFileId: string) => (state: AppRoot) =>
    state.app.storedPlaces.reading[mediaFileId] !== undefined;
