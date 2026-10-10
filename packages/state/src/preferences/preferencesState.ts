import type { Theme } from "./theme.ts";

export type PreferenceKey =
  | "showTranslations"
  | "textScale"
  | "losslessAudio"
  | "conversionNoticeDismissed"
  /** The reader's appearance, as JSON. */
  | "readerPreferences"
  /** How the subtitles over the video look, as JSON. */
  | "subtitleAppearance"
  /** The theme the user chose: "light", "dark", or anything else for the system's. */
  | "theme";

/** Every preference key, in the order the preferences are read. */
export const preferenceKeys: readonly PreferenceKey[] = [
  "showTranslations",
  "textScale",
  "losslessAudio",
  "conversionNoticeDismissed",
  "readerPreferences",
  "subtitleAppearance",
  "theme",
];

/** The preferences stored on the device, by key. */
export type PreferenceValues = Partial<Record<PreferenceKey, string>>;

/** How the player sounds and how fast it plays. Volume is 0 to 1; speed is a multiplier. */
export type PlayerControls = {
  volume: number;
  /** Silences the player without changing its volume. */
  isMuted: boolean;
  speed: number;
};

/** The user's preferences and the settings that go with them. */
export type PreferencesState = {
  values: PreferenceValues;
  /** False until the preferences stored on the device have been read once. */
  isLoaded: boolean;
  /** The operating system's theme, which the app shows unless the user chose one. */
  systemTheme: Theme;
  /** The player's controls, which carry from one media file to the next. Unlike `values`, they are not stored on the device and reset when the app starts. */
  playerControls: PlayerControls;
};

/** The preferences before any have been read from the device. */
export const initialPreferences: PreferencesState = {
  values: {},
  isLoaded: false,
  systemTheme: "light",
  playerControls: { volume: 1, isMuted: false, speed: 1 },
};

/** Returns the preferences with the loaded values over those already held, marked as loaded. */
export function withLoadedPreferences(
  preferences: PreferencesState,
  loaded: PreferenceValues,
): PreferencesState {
  return {
    ...preferences,
    values: { ...preferences.values, ...loaded },
    isLoaded: true,
  };
}
