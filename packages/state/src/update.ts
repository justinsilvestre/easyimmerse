import type { AppAction } from "./actions.ts";
import type { AppState, PreferenceKey } from "./appState.ts";
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
      return [
        {
          ...state,
          player: { ...state.player, currentTimeSeconds: action.seconds },
        },
        [],
      ];
    case "playerDurationChanged":
      return [
        {
          ...state,
          player: { ...state.player, durationSeconds: action.seconds },
        },
        [],
      ];
    case "playToggleRequested":
      return [state, [{ type: "togglePlayer" }]];
    case "playerPlayingChanged":
      return [
        { ...state, player: { ...state.player, isPlaying: action.isPlaying } },
        [],
      ];
    case "volumeChangeRequested":
      return [
        { ...state, player: { ...state.player, volume: action.volume } },
        [{ type: "setPlayerVolume", volume: action.volume }],
      ];
    case "speedChangeRequested":
      return [
        { ...state, player: { ...state.player, speed: action.speed } },
        [{ type: "setPlayerSpeed", speed: action.speed }],
      ];
    case "filePickRequested":
      return [
        { ...state, pendingFilePick: true },
        [{ type: "pickFile", accept: subtitleFileExtensions }],
      ];
    case "fileChosen":
      return [
        { ...state, pendingFilePick: false, chosenSubtitleFile: action.file },
        [],
      ];
    case "filePickCancelled":
      return [{ ...state, pendingFilePick: false }, []];
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
    case "openMedia":
      return [{ ...state, currentMediaFileId: action.mediaFileId }, []];
    case "closeMedia":
      return [
        {
          ...state,
          currentMediaFileId: null,
          chosenSubtitleFile: null,
          player: {
            ...initialPlayerState,
            volume: state.player.volume,
            speed: state.player.speed,
          },
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
