import type { PreferenceKey, PreferenceValues } from "./preferencesState.ts";
import type { Theme } from "./theme.ts";

export const preferencesActions = {
  preferenceToggled: (key: PreferenceKey) =>
    ({ type: "preferenceToggled", key }) as const,
  preferenceSet: (key: PreferenceKey, value: string) =>
    ({ type: "preferenceSet", key, value }) as const,
  preferencesLoadRequested: () =>
    ({ type: "preferencesLoadRequested" }) as const,
  preferencesLoaded: (preferences: PreferenceValues) =>
    ({ type: "preferencesLoaded", preferences }) as const,
  systemThemeChanged: (theme: Theme) =>
    ({ type: "systemThemeChanged", theme }) as const,
  textScaleChosen: (scale: number) =>
    ({ type: "textScaleChosen", scale }) as const,
  volumeChangeRequested: (volume: number) =>
    ({ type: "volumeChangeRequested", volume }) as const,
  muteToggleRequested: () => ({ type: "muteToggleRequested" }) as const,
  speedChangeRequested: (speed: number) =>
    ({ type: "speedChangeRequested", speed }) as const,
};

export type PreferencesAction = ReturnType<
  (typeof preferencesActions)[keyof typeof preferencesActions]
>;

export type PreferencesEffect =
  | { type: "savePreference"; key: PreferenceKey; value: string }
  | { type: "loadPreferences"; keys: readonly PreferenceKey[] }
  | { type: "setPlayerVolume"; volume: number }
  | { type: "setPlayerMuted"; isMuted: boolean }
  | { type: "setPlayerSpeed"; speed: number };
