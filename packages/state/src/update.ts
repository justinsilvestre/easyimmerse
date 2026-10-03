import type { AppAction } from "./actions.ts";
import type { AppState, PreferenceKey } from "./appState.ts";
import { preferenceKeys } from "./appState.ts";
import type { Effect } from "./effect.ts";
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
      return [state, [{ type: "seekPlayer", seconds: action.seconds }]];
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
    case "preferenceToggled":
      return togglePreference(state, action.key);
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
