import type { Feature, FeatureUpdate } from "../app/feature.ts";
import type { PreferencesEffect } from "./preferencesEffect.ts";
import type {
  PlayerControls,
  PreferenceKey,
  PreferencesState,
} from "./preferencesState.ts";
import { initialPreferences, preferenceKeys } from "./preferencesState.ts";

/** Updates the preferences, saving each one the user changes. */
export const updatePreferences: FeatureUpdate<PreferencesState> = (
  preferences,
  action,
) => {
  switch (action.type) {
    case "preferenceToggled": {
      const value =
        preferences.values[action.key] === "true" ? "false" : "true";
      return save(preferences, action.key, value);
    }
    case "preferenceSet":
      return save(preferences, action.key, action.value);
    case "textScaleChosen":
      return save(preferences, "textScale", String(action.scale));
    case "preferencesLoadRequested":
      return [preferences, [{ type: "loadPreferences", keys: preferenceKeys }]];
    case "preferencesLoaded":
      return [
        {
          ...preferences,
          values: { ...preferences.values, ...action.preferences },
          isLoaded: true,
        },
        [],
      ];
    case "systemThemeChanged":
      return [{ ...preferences, systemTheme: action.theme }, []];
    case "volumeChangeRequested":
      return [
        withControls(preferences, { volume: action.volume }),
        [{ type: "setPlayerVolume", volume: action.volume }],
      ];
    case "muteToggleRequested": {
      const isMuted = !preferences.playerControls.isMuted;
      return [
        withControls(preferences, { isMuted }),
        [{ type: "setPlayerMuted", isMuted }],
      ];
    }
    case "speedChangeRequested":
      return [
        withControls(preferences, { speed: action.speed }),
        [{ type: "setPlayerSpeed", speed: action.speed }],
      ];
    default:
      return [preferences, []];
  }
};

/** The preferences as a feature: the stored preferences, the system theme and the player's controls. */
export const preferencesFeature: Feature<PreferencesState> = {
  initialState: initialPreferences,
  update: updatePreferences,
};

function save(
  preferences: PreferencesState,
  key: PreferenceKey,
  value: string,
): readonly [PreferencesState, PreferencesEffect[]] {
  return [
    { ...preferences, values: { ...preferences.values, [key]: value } },
    [{ type: "savePreference", key, value }],
  ];
}

function withControls(
  preferences: PreferencesState,
  controls: Partial<PlayerControls>,
): PreferencesState {
  return {
    ...preferences,
    playerControls: { ...preferences.playerControls, ...controls },
  };
}
