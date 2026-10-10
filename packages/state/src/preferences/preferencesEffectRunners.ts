import { actions } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";
import type { Effects } from "../platform/effects.ts";
import { ignoreFailure } from "../platform/ignoreFailure.ts";
import type { PreferencesEffect } from "./preferencesActions.ts";
import type { PreferenceKey, PreferenceValues } from "./preferencesState.ts";

export const preferencesEffectRunners = {
  savePreference: (effect, effects) => {
    effects.savePreference(effect.key, effect.value).catch(ignoreFailure);
  },
  loadPreferences: (effect, effects, dispatch) => {
    loadPreferences(effects, effect.keys).then((preferences) =>
      dispatch(actions.preferencesLoaded(preferences)),
    );
  },
  setPlayerVolume: (effect, effects) => effects.setPlayerVolume(effect.volume),
  setPlayerMuted: (effect, effects) => effects.setPlayerMuted(effect.isMuted),
  setPlayerSpeed: (effect, effects) => effects.setPlayerSpeed(effect.speed),
} satisfies EffectRunners<PreferencesEffect>;

/** Reads each stored preference, leaving out those that are unset or cannot be read. */
async function loadPreferences(
  effects: Effects,
  keys: readonly PreferenceKey[],
): Promise<PreferenceValues> {
  const values = await Promise.all(
    keys.map((key) => effects.loadPreference(key).catch(() => null)),
  );
  return Object.fromEntries(
    keys.flatMap((key, index) => {
      const value = values[index];
      return value === null || value === undefined ? [] : [[key, value]];
    }),
  );
}
