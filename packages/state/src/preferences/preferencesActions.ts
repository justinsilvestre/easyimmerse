import type { PreferenceKey, PreferenceValues } from "./preferencesState.ts";
import type { Theme } from "./theme.ts";

/** The action creators of the preferences and the player's controls. */
export const preferencesActions = {
  preferenceToggled: (key: PreferenceKey) =>
    ({ type: "preferenceToggled", key }) as const,
  preferenceSet: (key: PreferenceKey, value: string) =>
    ({ type: "preferenceSet", key, value }) as const,
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

/** An action of the preferences. */
export type PreferencesAction = ReturnType<
  (typeof preferencesActions)[keyof typeof preferencesActions]
>;
