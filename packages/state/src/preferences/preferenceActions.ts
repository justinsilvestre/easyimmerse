import type { PreferenceKey } from "./preferenceKey.ts";

export const preferenceActions = {
  preferenceToggled: (key: PreferenceKey) =>
    ({ type: "preferenceToggled", key }) as const,
  preferencesLoadRequested: () =>
    ({ type: "preferencesLoadRequested" }) as const,
  preferenceLoaded: (key: PreferenceKey, value: string | null) =>
    ({ type: "preferenceLoaded", key, value }) as const,
};
