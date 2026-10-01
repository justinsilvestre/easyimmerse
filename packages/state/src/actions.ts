import type { Action } from "redux";
import type { PreferenceKey } from "./appState.ts";
import type { PickedFile } from "./effects.ts";

export const actions = {
  seekRequested: (seconds: number) =>
    ({ type: "seekRequested", seconds }) as const,
  playerTimeChanged: (seconds: number) =>
    ({ type: "playerTimeChanged", seconds }) as const,
  filePickRequested: () => ({ type: "filePickRequested" }) as const,
  fileChosen: (file: PickedFile) => ({ type: "fileChosen", file }) as const,
  filePickCancelled: () => ({ type: "filePickCancelled" }) as const,
  preferenceToggled: (key: PreferenceKey) =>
    ({ type: "preferenceToggled", key }) as const,
  preferencesLoadRequested: () =>
    ({ type: "preferencesLoadRequested" }) as const,
  preferenceLoaded: (key: PreferenceKey, value: string | null) =>
    ({ type: "preferenceLoaded", key, value }) as const,
  notificationRequested: (message: string) =>
    ({ type: "notificationRequested", message }) as const,
  cueCopyRequested: (text: string) =>
    ({ type: "cueCopyRequested", text }) as const,
  externalLinkRequested: (url: string) =>
    ({ type: "externalLinkRequested", url }) as const,
};

export type AppAction = ReturnType<(typeof actions)[keyof typeof actions]>;

/** Tells whether a Redux action is one of the app's own, as opposed to one from Redux itself or from another slice. */
export function isAppAction(action: Action): action is AppAction {
  return Object.hasOwn(actions, action.type);
}
