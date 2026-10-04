import type { AppAction } from "./actions.ts";
import type { AppState, PlayerState, PreferenceKey } from "./appState.ts";
import { initialPlayerState, preferenceKeys } from "./appState.ts";
import type { Effect } from "./effect.ts";
import { mediaFileExtensions } from "./mediaFileExtensions.ts";
import { followSystemTheme, toggleTheme } from "./theme.ts";

/** Computes the next state and the effects to perform in response to an action. */
export type Update<S, A, E> = (
  state: S,
  action: A,
) => readonly [S, readonly E[]];

const subtitleFileExtensions: readonly string[] = [".srt", ".vtt"];

export const update: Update<AppState, AppAction, Effect> = (state, action) => {
  switch (action.type) {
    case "seekRequested":
      return [
        {
          ...state,
          player: { ...state.player, currentTimeSeconds: action.seconds },
        },
        [{ type: "seekPlayer", seconds: action.seconds }],
      ];
    case "playerTimeChanged":
      return [withPlayer(state, { currentTimeSeconds: action.seconds }), []];
    case "playerDurationChanged":
      return [withPlayer(state, { durationSeconds: action.seconds }), []];
    case "playerPlayingChanged":
      return [withPlayer(state, { isPlaying: action.isPlaying }), []];
    case "playerVolumeChanged":
      return [withPlayer(state, { volume: action.volume }), []];
    case "playerRateChanged":
      return [withPlayer(state, { rate: action.rate }), []];
    case "playToggleRequested":
      return [
        state,
        [
          {
            type: "controlPlayer",
            command: { kind: state.player.isPlaying ? "pause" : "play" },
          },
        ],
      ];
    case "playRequested":
      return [state, [{ type: "controlPlayer", command: { kind: "play" } }]];
    case "pauseRequested":
      return [state, [{ type: "controlPlayer", command: { kind: "pause" } }]];
    case "volumeChosen":
      return [
        state,
        [
          {
            type: "controlPlayer",
            command: { kind: "setVolume", volume: action.volume },
          },
        ],
      ];
    case "rateChosen":
      return [
        state,
        [
          {
            type: "controlPlayer",
            command: { kind: "setRate", rate: action.rate },
          },
        ],
      ];
    case "subtitleFilePickRequested":
      return [
        { ...state, pendingSubtitlePick: action.role },
        [{ type: "pickFile", accept: subtitleFileExtensions }],
      ];
    case "fileChosen":
      return [
        {
          ...state,
          pendingSubtitlePick: null,
          chosenSubtitleFile:
            state.pendingSubtitlePick === null
              ? null
              : { file: action.file, role: state.pendingSubtitlePick },
        },
        [],
      ];
    case "filePickCancelled":
      return [{ ...state, pendingSubtitlePick: null }, []];
    case "subtitleFileAdded":
      return [{ ...state, chosenSubtitleFile: null }, []];
    case "subtitleFileAddFailed":
      return [
        { ...state, chosenSubtitleFile: null },
        [
          {
            type: "showNotification",
            message: "The subtitles file could not be added",
          },
        ],
      ];
    case "mediaFilePickRequested":
      return [
        { ...state, pendingMediaFilePick: true },
        [{ type: "pickMediaFile", accept: mediaFileExtensions }],
      ];
    case "mediaFileChosen":
      return [
        { ...state, pendingMediaFilePick: false, chosenMediaFile: action.file },
        [],
      ];
    case "mediaFilePickCancelled":
      return [{ ...state, pendingMediaFilePick: false }, []];
    case "mediaFileAdded":
      return [
        {
          ...state,
          chosenMediaFile: null,
          currentMediaFileId: action.mediaFileId,
        },
        [],
      ];
    case "chosenMediaFileTaken":
      return [{ ...state, chosenMediaFile: null }, []];
    case "mediaFileAddFailed":
      return [
        { ...state, chosenMediaFile: null },
        [
          {
            type: "showNotification",
            message: "The media file could not be added",
          },
        ],
      ];
    case "mediaFileRemoved":
      return [
        {
          ...state,
          currentMediaFileId:
            state.currentMediaFileId === action.mediaFileId
              ? null
              : state.currentMediaFileId,
        },
        [],
      ];
    case "dictionaryFilePickRequested":
      return [
        {
          ...state,
          pendingDictionaryPick: action.languages,
          unsupportedDictionaryFile: null,
        },
        [{ type: "pickDictionaryFile" }],
      ];
    case "dictionaryFileChosen":
      return [
        {
          ...state,
          pendingDictionaryPick: null,
          chosenDictionaryFile:
            state.pendingDictionaryPick === null
              ? null
              : { file: action.file, languages: state.pendingDictionaryPick },
        },
        [],
      ];
    case "dictionaryFilePickCancelled":
      return [{ ...state, pendingDictionaryPick: null }, []];
    case "dictionaryFileImported":
      return [{ ...state, chosenDictionaryFile: null }, []];
    case "dictionaryFileUnsupported":
      return [
        {
          ...state,
          chosenDictionaryFile: null,
          unsupportedDictionaryFile: action.fileName,
        },
        [],
      ];
    case "dictionaryFileImportFailed":
      return [
        { ...state, chosenDictionaryFile: null },
        [
          {
            type: "showNotification",
            message: "The dictionary could not be added",
          },
        ],
      ];
    case "unsupportedDictionaryFileDismissed":
      return [{ ...state, unsupportedDictionaryFile: null }, []];
    case "openMedia":
      return [{ ...state, currentMediaFileId: action.mediaFileId }, []];
    case "closeMedia":
      return [
        {
          ...state,
          currentMediaFileId: null,
          player: initialPlayerState,
        },
        [],
      ];
    case "preferenceToggled":
      return togglePreference(state, action.key);
    case "preferenceSet":
      return [
        setPreference(state, action.key, action.value),
        [{ type: "savePreference", key: action.key, value: action.value }],
      ];
    case "preferencesLoadRequested":
      return [state, [{ type: "loadPreferences", keys: preferenceKeys }]];
    case "preferencesLoaded":
      return [
        {
          ...state,
          preferences: { ...state.preferences, ...action.preferences },
          preferencesLoaded: true,
        },
        [],
      ];
    case "notificationRequested":
      return [state, [{ type: "showNotification", message: action.message }]];
    case "cueCopyRequested":
      return [
        state,
        [
          { type: "copyToClipboard", text: action.text },
          { type: "showNotification", message: "Copied to clipboard" },
        ],
      ];
    case "externalLinkRequested":
      return [state, [{ type: "openExternalUrl", url: action.url }]];
    case "systemThemeChanged":
      return [
        { ...state, theme: followSystemTheme(state.theme, action.theme) },
        [],
      ];
    case "themeToggled":
      return [{ ...state, theme: toggleTheme(state.theme) }, []];
    case "textScaleChosen":
      return [
        setPreference(state, "textScale", String(action.scale)),
        [
          {
            type: "savePreference",
            key: "textScale",
            value: String(action.scale),
          },
        ],
      ];
  }
};

function withPlayer(state: AppState, changes: Partial<PlayerState>): AppState {
  return { ...state, player: { ...state.player, ...changes } };
}

function togglePreference(
  state: AppState,
  key: PreferenceKey,
): readonly [AppState, Effect[]] {
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
