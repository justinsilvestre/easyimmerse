import type { PreferenceKey } from "./preferencesState.ts";

/** The side effects of the preferences: reading and writing the stored ones, and applying the player's controls. */
export type PreferencesEffect =
  | { type: "savePreference"; key: PreferenceKey; value: string }
  | { type: "loadPreferences"; keys: readonly PreferenceKey[] }
  | { type: "setPlayerVolume"; volume: number }
  | { type: "setPlayerMuted"; isMuted: boolean }
  | { type: "setPlayerSpeed"; speed: number };
