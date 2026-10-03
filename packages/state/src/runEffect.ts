import type { AppAction } from "./actions.ts";
import { actions } from "./actions.ts";
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
    case "loadPreference":
      effects
        .loadPreference(effect.key)
        .then((value) => dispatch(actions.preferenceLoaded(effect.key, value)))
        .catch(ignoreFailure);
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

/** Rejections other than a failed file pick are dropped for now. Reporting errors to the user is a later effect. */
function ignoreFailure(): void {}
