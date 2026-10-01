import type { AppAction } from "./actions.ts";
import { actions } from "./actions.ts";
import type { Effect } from "./effect.ts";
import type { Effects } from "./effects.ts";

type Dispatch = (action: AppAction) => void;

/** Performs one effect. Effects that produce a result dispatch the corresponding action once it arrives. */
export function runEffect(
  effect: Effect,
  effects: Effects,
  dispatch: Dispatch,
): void {
  switch (effect.type) {
    case "seekPlayer":
      effects.seekPlayer(effect.ms);
      return;
    case "playPlayer":
      effects.playPlayer();
      return;
    case "pausePlayer":
      effects.pausePlayer();
      return;
    case "setPlayerLoop":
      effects.setPlayerLoop(effect.range);
      return;
    case "setPlaybackRate":
      effects.setPlaybackRate(effect.rate);
      return;
    case "setVolume":
      effects.setVolume(effect.volume);
      return;
    case "captureFrame":
      effects
        .captureFrame()
        .then((dataUrl) => dispatch(actions.frameCaptured(dataUrl)))
        .catch(() => dispatch(actions.frameCaptured(null)));
      return;
    case "pickFile":
      pickFile(effect, effects, dispatch);
      return;
    case "resolveMediaUrl":
      resolveMediaUrl(effect, effects, dispatch);
      return;
    case "readStoredFileText":
      readStoredFileText(effect, effects, dispatch);
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

function pickFile(
  { purpose, accept }: Extract<Effect, { type: "pickFile" }>,
  effects: Effects,
  dispatch: Dispatch,
): void {
  effects
    .pickFile(purpose, accept)
    .then((file) =>
      dispatch(
        file ? actions.fileChosen(purpose, file) : actions.filePickCancelled(),
      ),
    )
    .catch(() => dispatch(actions.filePickCancelled()));
}

function resolveMediaUrl(
  { projectId, media }: Extract<Effect, { type: "resolveMediaUrl" }>,
  effects: Effects,
  dispatch: Dispatch,
): void {
  effects
    .resolveMediaUrl(projectId, media)
    .then((url) => dispatch(actions.mediaUrlResolved(media.id, url)))
    .catch((error: unknown) =>
      dispatch(actions.mediaUrlFailed(media.id, describeError(error))),
    );
}

function readStoredFileText(
  { trackId, key }: Extract<Effect, { type: "readStoredFileText" }>,
  effects: Effects,
  dispatch: Dispatch,
): void {
  effects
    .readStoredFileText(key)
    .then((text) => dispatch(actions.subtitleTextLoaded(trackId, text)))
    .catch((error: unknown) =>
      dispatch(actions.subtitleTextFailed(trackId, describeError(error))),
    );
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Rejections of preference and clipboard effects are dropped for now. Reporting them to the user is a later effect. */
function ignoreFailure(): void {}
