import type { PreferenceKey } from "./appState.ts";
import type { RootState } from "./createAppStore.ts";
import { chooseTheme } from "./theme.ts";

export const selectCurrentTime = (state: RootState) =>
  state.app.player.currentTimeSeconds;

export const selectPlayerDuration = (state: RootState) =>
  state.app.player.durationSeconds;

export const selectSubtitleSource = (state: RootState) =>
  state.app.subtitleSource;

export const selectPreference = (key: PreferenceKey) => (state: RootState) =>
  state.app.preferences[key];

export const selectPreferencesLoaded = (state: RootState) =>
  state.app.preferencesLoaded;

export const selectPendingFilePick = (state: RootState) =>
  state.app.pendingFilePick;

export const selectCurrentMediaFileId = (state: RootState) =>
  state.app.currentMediaFileId;

export const selectPendingMediaFilePick = (state: RootState) =>
  state.app.pendingMediaFilePick;

export const selectChosenMediaFile = (state: RootState) =>
  state.app.chosenMediaFile;

/** Returns the theme the app shows: the one the user chose, or else the operating system's. */
export const selectTheme = (state: RootState) => chooseTheme(state.app.theme);
