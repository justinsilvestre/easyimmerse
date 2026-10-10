import type { RootState } from "../app/createAppStore.ts";

/** Returns the book's last reading place, null when it has none, or undefined until its stored place has been read. */
export const selectReadingLocation =
  (mediaFileId: string) => (state: RootState) =>
    state.app.storedPlaces.reading[mediaFileId];
