import type { AppState } from "../appState.ts";
import type { UpdateHandlers, UpdateResult } from "../updateHandlers.ts";
import type { PreferenceKey } from "./preferenceKey.ts";
import { preferenceKeys } from "./preferenceKey.ts";

export const preferenceHandlers = {
  preferenceToggled: (state, { key }) => togglePreference(state, key),
  preferencesLoadRequested: (state) => [
    state,
    preferenceKeys.map((key) => ({ type: "loadPreference", key })),
  ],
  preferenceLoaded: (state, { key, value }) => [
    value === null ? state : setPreference(state, key, value),
    [],
  ],
} satisfies Partial<UpdateHandlers>;

function togglePreference(state: AppState, key: PreferenceKey): UpdateResult {
  const value = state.preferences[key] === "true" ? "false" : "true";
  return [
    setPreference(state, key, value),
    [{ type: "savePreference", key, value }],
  ];
}

function setPreference(
  state: AppState,
  key: PreferenceKey,
  value: string,
): AppState {
  return { ...state, preferences: { ...state.preferences, [key]: value } };
}
