import type { Action } from "redux";
import type { AppState, PreferenceKey } from "./appState.ts";
import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "./effects.ts";
import type { ReaderLocation } from "./readingLocation.ts";
import type { Theme } from "./theme.ts";

export const actions = {
  seekRequested: (seconds: number) =>
    ({ type: "seekRequested", seconds }) as const,
  playerTimeChanged: (seconds: number) =>
    ({ type: "playerTimeChanged", seconds }) as const,
  playerDurationChanged: (seconds: number) =>
    ({ type: "playerDurationChanged", seconds }) as const,
  playToggleRequested: () => ({ type: "playToggleRequested" }) as const,
  playRequested: () => ({ type: "playRequested" }) as const,
  pauseRequested: () => ({ type: "pauseRequested" }) as const,
  playerPlayingChanged: (isPlaying: boolean) =>
    ({ type: "playerPlayingChanged", isPlaying }) as const,
  volumeChangeRequested: (volume: number) =>
    ({ type: "volumeChangeRequested", volume }) as const,
  speedChangeRequested: (speed: number) =>
    ({ type: "speedChangeRequested", speed }) as const,
  filePickRequested: () => ({ type: "filePickRequested" }) as const,
  fileChosen: (file: PickedFile) => ({ type: "fileChosen", file }) as const,
  filePickCancelled: () => ({ type: "filePickCancelled" }) as const,
  subtitleFileAdded: () => ({ type: "subtitleFileAdded" }) as const,
  subtitleFileAddFailed: () => ({ type: "subtitleFileAddFailed" }) as const,
  mediaFilePickRequested: () => ({ type: "mediaFilePickRequested" }) as const,
  mediaFileChosen: (file: PickedMediaFile) =>
    ({ type: "mediaFileChosen", file }) as const,
  mediaFilePickCancelled: () => ({ type: "mediaFilePickCancelled" }) as const,
  mediaFileAdded: (mediaFileId: string) =>
    ({ type: "mediaFileAdded", mediaFileId }) as const,
  mediaFileAddFailed: () => ({ type: "mediaFileAddFailed" }) as const,
  mediaFileRemoved: (mediaFileId: string) =>
    ({ type: "mediaFileRemoved", mediaFileId }) as const,
  dictionaryFilePickRequested: () =>
    ({ type: "dictionaryFilePickRequested" }) as const,
  dictionaryFileChosen: (file: PickedDictionaryFile) =>
    ({ type: "dictionaryFileChosen", file }) as const,
  dictionaryFilePickCancelled: () =>
    ({ type: "dictionaryFilePickCancelled" }) as const,
  dictionaryFileHandled: () => ({ type: "dictionaryFileHandled" }) as const,
  openMedia: (mediaFileId: string) =>
    ({ type: "openMedia", mediaFileId }) as const,
  closeMedia: () => ({ type: "closeMedia" }) as const,
  readingLocationLoadRequested: (mediaFileId: string) =>
    ({ type: "readingLocationLoadRequested", mediaFileId }) as const,
  readingLocationLoaded: (
    mediaFileId: string,
    location: ReaderLocation | null,
  ) => ({ type: "readingLocationLoaded", mediaFileId, location }) as const,
  readingLocationReported: (mediaFileId: string, location: ReaderLocation) =>
    ({ type: "readingLocationReported", mediaFileId, location }) as const,
  preferenceToggled: (key: PreferenceKey) =>
    ({ type: "preferenceToggled", key }) as const,
  preferenceSet: (key: PreferenceKey, value: string) =>
    ({ type: "preferenceSet", key, value }) as const,
  preferencesLoadRequested: () =>
    ({ type: "preferencesLoadRequested" }) as const,
  preferencesLoaded: (preferences: AppState["preferences"]) =>
    ({ type: "preferencesLoaded", preferences }) as const,
  notificationRequested: (message: string) =>
    ({ type: "notificationRequested", message }) as const,
  /** Work that closing the app would lose has begun, such as a flashcard save or unsaved changes; the app warns before closing until all of it ends. */
  unsavedWorkBegan: () => ({ type: "unsavedWorkBegan" }) as const,
  unsavedWorkEnded: () => ({ type: "unsavedWorkEnded" }) as const,
  externalLinkRequested: (url: string) =>
    ({ type: "externalLinkRequested", url }) as const,
  systemThemeChanged: (theme: Theme) =>
    ({ type: "systemThemeChanged", theme }) as const,
  themeToggled: () => ({ type: "themeToggled" }) as const,
  textScaleChosen: (scale: number) =>
    ({ type: "textScaleChosen", scale }) as const,
};

export type AppAction = ReturnType<(typeof actions)[keyof typeof actions]>;

/** Tells whether a Redux action is one of the app's own, as opposed to one from Redux itself or from another slice. */
export function isAppAction(action: Action): action is AppAction {
  return Object.hasOwn(actions, action.type);
}
