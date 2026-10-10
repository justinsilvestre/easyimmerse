import type { RootState } from "../app/createAppStore.ts";

/** Tells whether the book's stored reading place has been read, whether or not one was stored. */
export const selectIsReadingLocationLoaded =
  (mediaFileId: string) => (state: RootState) =>
    state.app.storedPlaces.reading[mediaFileId] !== undefined;
