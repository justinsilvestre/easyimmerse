import type { PreferenceKey } from "./appState.ts";
import type { RootState } from "./createAppStore.ts";
import { parseTextSize } from "./textSize.ts";
import { chooseTheme } from "./theme.ts";

export const selectCurrentTime = (state: RootState) =>
  state.app.player.currentTimeSeconds;

export const selectSubtitleSource = (state: RootState) =>
  state.app.subtitleSource;

export const selectPreference = (key: PreferenceKey) => (state: RootState) =>
  state.app.preferences[key];

export const selectPendingFilePick = (state: RootState) =>
  state.app.pendingFilePick;

/** Returns the theme the app shows: the one the user chose, or else the operating system's. */
export const selectTheme = (state: RootState) => chooseTheme(state.app.theme);

/** Returns the text size the user chose, or medium until one is chosen. */
export const selectTextSize = (state: RootState) =>
  parseTextSize(state.app.preferences.textSize);
