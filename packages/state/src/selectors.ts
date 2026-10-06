import type { PreferenceKey } from "./appState.ts";
import type { RootState } from "./createAppStore.ts";
import { parseTextScale } from "./textScale.ts";
import { chooseTheme } from "./theme.ts";

export const selectCurrentTime = (state: RootState) =>
  state.app.player.currentTimeSeconds;

export const selectPlayerDuration = (state: RootState) =>
  state.app.player.durationSeconds;

export const selectPlayer = (state: RootState) => state.app.player;

export const selectChosenSubtitleFile = (state: RootState) =>
  state.app.chosenSubtitleFile;

export const selectPreference = (key: PreferenceKey) => (state: RootState) =>
  state.app.preferences[key];

export const selectPreferencesLoaded = (state: RootState) =>
  state.app.preferencesLoaded;

export const selectPendingFilePick = (state: RootState) =>
  state.app.pendingFilePick;

export const selectCurrentMediaFileId = (state: RootState) =>
  state.app.currentMediaFileId;

export const selectChosenMediaFile = (state: RootState) =>
  state.app.chosenMediaFile;

/** Returns the book's last reading place, null when it has none, or undefined until its stored place has been read. */
export const selectReadingLocation =
  (mediaFileId: string) => (state: RootState) =>
    state.app.readingLocations[mediaFileId];

export const selectChosenDictionaryFile = (state: RootState) =>
  state.app.chosenDictionaryFile;

/** Returns the theme the app shows: the one the user chose, or else the operating system's. */
export const selectTheme = (state: RootState) => chooseTheme(state.app.theme);

/** Returns the text scale the user chose, as a percentage, or 100 until one is chosen. */
export const selectTextScale = (state: RootState) =>
  parseTextScale(state.app.preferences.textScale);
