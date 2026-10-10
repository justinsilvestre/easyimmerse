import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { applyingAppearance } from "./appearance.ts";
import type {
  PlayerControls,
  PreferenceKey,
  PreferencesState,
} from "./preferencesState.ts";
import {
  initialPreferences,
  preferenceKeys,
  withLoadedPreferences,
} from "./preferencesState.ts";

/**
 * Updates the preferences, loading them when the app starts and saving each one the user changes,
 * the conversion notice's dismissal included when it is accepted with its box ticked.
 */
export const updatePreferences: FeatureUpdate<PreferencesState> = (
  preferences,
  action,
  app,
) => {
  switch (action.type) {
    case "conversionNoticeAccepted": {
      const { dialog } = app.screen;
      return dialog?.kind === "conversionNotice" && dialog.dismissForGood
        ? save(preferences, "conversionNoticeDismissed", "true")
        : updated(preferences);
    }
    case "preferenceToggled": {
      const value =
        preferences.values[action.key] === "true" ? "false" : "true";
      return save(preferences, action.key, value);
    }
    case "preferenceSet":
      return save(preferences, action.key, action.value);
    case "textScaleChosen":
      return save(preferences, "textScale", String(action.scale));
    case "appStarted":
      return updated(preferences, {
        type: "loadPreferences",
        keys: preferenceKeys,
      });
    case "preferencesLoaded":
      return updated(withLoadedPreferences(preferences, action.preferences));
    case "systemThemeChanged":
      return updated({ ...preferences, systemTheme: action.theme });
    case "volumeChangeRequested":
      return updated(withControls(preferences, { volume: action.volume }), {
        type: "setPlayerVolume",
        volume: action.volume,
      });
    case "muteToggleRequested": {
      const isMuted = !preferences.playerControls.isMuted;
      return updated(withControls(preferences, { isMuted }), {
        type: "setPlayerMuted",
        isMuted,
      });
    }
    case "speedChangeRequested":
      return updated(withControls(preferences, { speed: action.speed }), {
        type: "setPlayerSpeed",
        speed: action.speed,
      });
    default:
      return updated(preferences);
  }
};

/** The preferences as a feature: the stored preferences, the system theme and the player's controls, with the appearance they call for applied. */
export const preferencesFeature: Feature<PreferencesState> = {
  initialState: initialPreferences,
  update: applyingAppearance(updatePreferences),
};

function save(
  preferences: PreferencesState,
  key: PreferenceKey,
  value: string,
) {
  return updated(
    { ...preferences, values: { ...preferences.values, [key]: value } },
    { type: "savePreference", key, value },
  );
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
