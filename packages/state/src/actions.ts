import type { Action } from "redux";
import type {
  AppState,
  DictionaryLanguages,
  PreferenceKey,
  SubtitleRole,
} from "./appState.ts";
import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "./effects.ts";
import type { Theme } from "./theme.ts";

export const actions = {
  seekRequested: (seconds: number) =>
    ({ type: "seekRequested", seconds }) as const,
  playerTimeChanged: (seconds: number) =>
    ({ type: "playerTimeChanged", seconds }) as const,
  playerDurationChanged: (seconds: number) =>
    ({ type: "playerDurationChanged", seconds }) as const,
  playerPlayingChanged: (isPlaying: boolean) =>
    ({ type: "playerPlayingChanged", isPlaying }) as const,
  playerVolumeChanged: (volume: number) =>
    ({ type: "playerVolumeChanged", volume }) as const,
  playerRateChanged: (rate: number) =>
    ({ type: "playerRateChanged", rate }) as const,
  playToggleRequested: () => ({ type: "playToggleRequested" }) as const,
  playRequested: () => ({ type: "playRequested" }) as const,
  pauseRequested: () => ({ type: "pauseRequested" }) as const,
  volumeChosen: (volume: number) => ({ type: "volumeChosen", volume }) as const,
  rateChosen: (rate: number) => ({ type: "rateChosen", rate }) as const,
  subtitleFilePickRequested: (role: SubtitleRole) =>
    ({ type: "subtitleFilePickRequested", role }) as const,
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
  chosenMediaFileTaken: () => ({ type: "chosenMediaFileTaken" }) as const,
  mediaFileRemoved: (mediaFileId: string) =>
    ({ type: "mediaFileRemoved", mediaFileId }) as const,
  dictionaryFilePickRequested: (languages: DictionaryLanguages) =>
    ({ type: "dictionaryFilePickRequested", languages }) as const,
  dictionaryFileChosen: (file: PickedDictionaryFile) =>
    ({ type: "dictionaryFileChosen", file }) as const,
  dictionaryFilePickCancelled: () =>
    ({ type: "dictionaryFilePickCancelled" }) as const,
  dictionaryFileImported: () => ({ type: "dictionaryFileImported" }) as const,
  dictionaryFileUnsupported: (fileName: string) =>
    ({ type: "dictionaryFileUnsupported", fileName }) as const,
  dictionaryFileImportFailed: () =>
    ({ type: "dictionaryFileImportFailed" }) as const,
  unsupportedDictionaryFileDismissed: () =>
    ({ type: "unsupportedDictionaryFileDismissed" }) as const,
  openMedia: (mediaFileId: string) =>
    ({ type: "openMedia", mediaFileId }) as const,
  closeMedia: () => ({ type: "closeMedia" }) as const,
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
  cueCopyRequested: (text: string) =>
    ({ type: "cueCopyRequested", text }) as const,
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
