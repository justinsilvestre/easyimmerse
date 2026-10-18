import type { AppRoot } from "../app/createAppStore.ts";
import { appearanceOf } from "./appearance.ts";
import type { PreferenceKey } from "./preferencesState.ts";
import { parseThemeChoice } from "./theme.ts";

/** Returns a stored preference's value, or undefined while it is unset. */
export const selectPreference = (key: PreferenceKey) => (state: AppRoot) =>
  state.app.preferences.values[key];

/** Tells whether the preferences stored on the device have been read. */
export const selectPreferencesLoaded = (state: AppRoot) =>
  state.app.preferences.isLoaded;

/** Returns the player's volume, mute and speed. */
export const selectPlayerControls = (state: AppRoot) =>
  state.app.preferences.playerControls;

/** Returns the theme the user chose, or "system" until one is chosen. */
export const selectThemeChoice = (state: AppRoot) =>
  parseThemeChoice(state.app.preferences.values.theme);

/** Returns the theme the app shows: the one the user chose, or else the operating system's. */
export const selectTheme = (state: AppRoot) =>
  appearanceOf(state.app.preferences).theme;

/** Returns the text scale the user chose, as a percentage, or 100 until one is chosen. */
export const selectTextScale = (state: AppRoot) =>
  appearanceOf(state.app.preferences).textScale;
