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
      effects.setPlayerLoop(effect.loop);
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
    case "resolveMediaPlayback":
      resolveMediaPlayback(effect, effects, dispatch);
      return;
    case "readStoredFileText":
      readStoredFileText(effect, effects, dispatch);
      return;
    case "readStoredFileBytes":
      readStoredFileBytes(effect, effects, dispatch);
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

function resolveMediaPlayback(
  { projectId, media }: Extract<Effect, { type: "resolveMediaPlayback" }>,
  effects: Effects,
  dispatch: Dispatch,
): void {
  effects
    .resolveMediaPlayback(projectId, media)
    .then((playback) =>
      dispatch(actions.mediaPlaybackResolved(media.id, playback)),
    )
    .catch((error: unknown) =>
      dispatch(actions.mediaPlaybackFailed(media.id, describeError(error))),
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

function readStoredFileBytes(
  { key, target }: Extract<Effect, { type: "readStoredFileBytes" }>,
  effects: Effects,
  dispatch: Dispatch,
): void {
  effects
    .readStoredFileBytes(key)
    .then((bytes) =>
      dispatch(
        target.kind === "chosenFile"
          ? actions.chosenFileBytesRead(key, bytes)
          : actions.documentBytesRead(target.mediaId, bytes),
      ),
    )
    .catch((error: unknown) => {
      dispatch(actions.storedFileReadFailed(describeError(error)));
      // A chosen file that cannot be read is let go of, since nothing can act on it.
      if (target.kind === "chosenFile") dispatch(actions.chosenFileHandled());
    });
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Rejections of preference and clipboard effects are dropped for now. Reporting them to the user is a later effect. */
function ignoreFailure(): void {}
