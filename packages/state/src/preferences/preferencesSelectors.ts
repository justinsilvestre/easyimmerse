import type { RootState } from "../app/createAppStore.ts";
import type { PreferenceKey } from "./preferencesState.ts";
import { parseTextScale } from "./textScale.ts";
import { chooseTheme, parseThemeChoice } from "./theme.ts";

/** Returns a stored preference's value, or undefined while it is unset. */
export const selectPreference = (key: PreferenceKey) => (state: RootState) =>
  state.app.preferences.values[key];

/** Tells whether the preferences stored on the device have been read. */
export const selectPreferencesLoaded = (state: RootState) =>
  state.app.preferences.isLoaded;

/** Returns the player's volume, mute and speed. */
export const selectPlayerControls = (state: RootState) =>
  state.app.preferences.playerControls;

/** Returns the theme the user chose, or "system" until one is chosen. */
export const selectThemeChoice = (state: RootState) =>
  parseThemeChoice(state.app.preferences.values.theme);

/** Returns the theme the app shows: the one the user chose, or else the operating system's. */
export const selectTheme = (state: RootState) =>
  chooseTheme(selectThemeChoice(state), state.app.preferences.systemTheme);

/** Returns the text scale the user chose, as a percentage, or 100 until one is chosen. */
export const selectTextScale = (state: RootState) =>
  parseTextScale(state.app.preferences.values.textScale);
