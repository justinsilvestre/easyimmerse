import type { AppAction } from "./actions.ts";
import { actions } from "./actions.ts";
import type { AppState, PreferenceKey } from "./appState.ts";
import type { Effect } from "./effect.ts";
import type { Effects } from "./effects.ts";

/** Performs one effect. Effects that produce a result dispatch the corresponding action once it arrives. */
export function runEffect(
  effect: Effect,
  effects: Effects,
  dispatch: (action: AppAction) => void,
): void {
  switch (effect.type) {
    case "seekPlayer":
      effects.seekPlayer(effect.seconds);
      return;
    case "togglePlayer":
      effects.togglePlayer();
      return;
    case "setPlayerVolume":
      effects.setPlayerVolume(effect.volume);
      return;
    case "setPlayerSpeed":
      effects.setPlayerSpeed(effect.speed);
      return;
    case "pickFile":
      effects
        .pickFile(effect.accept)
        .then((file) =>
          dispatch(
            file ? actions.fileChosen(file) : actions.filePickCancelled(),
          ),
        )
        .catch(() => dispatch(actions.filePickCancelled()));
      return;
    case "pickMediaFile":
      effects
        .pickMediaFile(effect.accept)
        .then((file) =>
          dispatch(
            file
              ? actions.mediaFileChosen(file)
              : actions.mediaFilePickCancelled(),
          ),
        )
        .catch(() => dispatch(actions.mediaFilePickCancelled()));
      return;
    case "savePreference":
      effects.savePreference(effect.key, effect.value).catch(ignoreFailure);
      return;
    case "loadPreferences":
      loadPreferences(effects, effect.keys).then((preferences) =>
        dispatch(actions.preferencesLoaded(preferences)),
      );
      return;
    case "showNotification":
      effects.showNotification(effect.message);
      return;
    case "copyToClipboard":
      effects.copyToClipboard(effect.text).catch(ignoreFailure);
      return;
    case "openExternalUrl":
      effects.openExternalUrl(effect.url);
      return;
  }
}

/** Reads each stored preference, leaving out those that are unset or cannot be read. */
async function loadPreferences(
  effects: Effects,
  keys: readonly PreferenceKey[],
): Promise<AppState["preferences"]> {
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

/** Rejections other than a failed file pick are dropped for now. Reporting errors to the user is a later effect. */
function ignoreFailure(): void {}
