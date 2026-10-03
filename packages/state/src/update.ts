import type { AppAction } from "./actions.ts";
import type { AppState, PreferenceKey } from "./appState.ts";
import { preferenceKeys } from "./appState.ts";
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
        { ...state, player: { currentTimeSeconds: action.seconds } },
        [{ type: "seekPlayer", seconds: action.seconds }],
      ];
    case "playerTimeChanged":
      return [{ ...state, player: { currentTimeSeconds: action.seconds } }, []];
    case "filePickRequested":
      return [
        { ...state, pendingFilePick: true },
        [{ type: "pickFile", accept: subtitleFileExtensions }],
      ];
    case "fileChosen":
      return [
        {
          ...state,
          pendingFilePick: false,
          subtitleSource: action.file.source,
        },
        [],
      ];
    case "filePickCancelled":
      return [{ ...state, pendingFilePick: false }, []];
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
    case "preferenceToggled":
      return togglePreference(state, action.key);
    case "preferenceSet":
      return [
        setPreference(state, action.key, action.value),
        [{ type: "savePreference", key: action.key, value: action.value }],
      ];
    case "preferencesLoadRequested":
      return [
        state,
        preferenceKeys.map((key) => ({ type: "loadPreference", key })),
      ];
    case "preferenceLoaded":
      return [
        action.value === null
          ? state
          : setPreference(state, action.key, action.value),
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
