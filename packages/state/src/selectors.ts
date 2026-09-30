import type { PreferenceKey } from "./appState.ts";
import type { RootState } from "./createAppStore.ts";

export const selectCurrentTime = (state: RootState) =>
  state.app.player.currentTimeSeconds;

export const selectSubtitleSource = (state: RootState) =>
  state.app.subtitleSource;

export const selectPreference = (key: PreferenceKey) => (state: RootState) =>
  state.app.preferences[key];

export const selectPendingFilePick = (state: RootState) =>
  state.app.pendingFilePick;
