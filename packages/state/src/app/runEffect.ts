import type { Effects } from "../platform/effects.ts";
import {
  parsePlaybackPosition,
  playbackPositionKey,
} from "../storedPlaces/playbackPosition.ts";
import {
  parseReadingLocation,
  type ReaderLocation,
  readingLocationKey,
} from "../storedPlaces/readingLocation.ts";
import type { AppAction } from "./actions.ts";
import { actions } from "./actions.ts";
import type { AppState, PreferenceKey } from "./appState.ts";
import type { Effect } from "./effect.ts";

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
    case "playPlayer":
      effects.playPlayer();
      return;
    case "pausePlayer":
      effects.pausePlayer();
      return;
    case "setPlayerVolume":
      effects.setPlayerVolume(effect.volume);
      return;
    case "setPlayerMuted":
      effects.setPlayerMuted(effect.isMuted);
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
    case "pickDictionaryFile":
      effects
        .pickDictionaryFile(effect.accept)
        .then((file) =>
          dispatch(
            file
              ? actions.dictionaryFileChosen(file)
              : actions.dictionaryFilePickCancelled(),
          ),
        )
        .catch(() => dispatch(actions.dictionaryFilePickCancelled()));
      return;
    case "savePreference":
      effects.savePreference(effect.key, effect.value).catch(ignoreFailure);
      return;
    case "loadPreferences":
      loadPreferences(effects, effect.keys).then((preferences) =>
        dispatch(actions.preferencesLoaded(preferences)),
      );
      return;
    case "loadReadingLocation":
      loadReadingLocation(effects, effect.mediaFileId).then((location) =>
        dispatch(actions.readingLocationLoaded(effect.mediaFileId, location)),
      );
      return;
    case "saveReadingLocation":
      effects
        .savePreference(
          readingLocationKey(effect.mediaFileId),
          JSON.stringify(effect.location),
        )
        .catch(ignoreFailure);
      return;
    case "loadPlaybackPosition":
      effects
        .loadPreference(playbackPositionKey(effect.mediaFileId))
        .catch(() => null)
        .then((value) =>
          dispatch(
            actions.playbackPositionLoaded(
              effect.mediaFileId,
              parsePlaybackPosition(value),
            ),
          ),
        );
      return;
    case "savePlaybackPosition":
      effects
        .savePreference(
          playbackPositionKey(effect.mediaFileId),
          String(Math.round(effect.ms)),
        )
        .catch(ignoreFailure);
      return;
    case "showNotification":
      effects.showNotification(effect.message);
      return;
    case "openExternalUrl":
      effects.openExternalUrl(effect.url);
      return;
    case "guardClose":
      effects.guardClose(effect.isActive);
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

/** Reads a book's stored reading place, treating one that cannot be read as absent. */
async function loadReadingLocation(
  effects: Effects,
  mediaFileId: string,
): Promise<ReaderLocation | null> {
  const value = await effects
    .loadPreference(readingLocationKey(mediaFileId))
    .catch(() => null);
  return parseReadingLocation(value);
}

/** Rejections other than a failed file pick are dropped for now. Reporting errors to the user is a later effect. */
function ignoreFailure(): void {}
