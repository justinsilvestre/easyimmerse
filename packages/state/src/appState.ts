import type { PickedFile, PickedMediaFile } from "./effects.ts";
import type { ThemeState } from "./theme.ts";
import { initialThemeState } from "./theme.ts";

export type PreferenceKey =
  | "showTranslations"
  | "textScale"
  | "losslessAudio"
  | "conversionNoticeDismissed";

export const preferenceKeys: readonly PreferenceKey[] = [
  "showTranslations",
  "textScale",
  "losslessAudio",
  "conversionNoticeDismissed",
];

/** The player as the controls show it. Volume is 0 to 1; speed is a multiplier. */
export type PlayerState = {
  currentTimeSeconds: number;
  /** Zero until the player has loaded a file. */
  durationSeconds: number;
  isPlaying: boolean;
  volume: number;
  speed: number;
};

export const initialPlayerState: PlayerState = {
  currentTimeSeconds: 0,
  durationSeconds: 0,
  isPlaying: false,
  volume: 1,
  speed: 1,
};

export type AppState = {
  player: PlayerState;
  /** A picked subtitles file waiting to be added to the open media file through the backend. */
  chosenSubtitleFile: PickedFile | null;
  preferences: Partial<Record<PreferenceKey, string>>;
  /** False until the preferences stored on the device have been read once. */
  preferencesLoaded: boolean;
  pendingFilePick: boolean;
  /** The media file the media screen shows. Null until one is opened. */
  currentMediaFileId: string | null;
  pendingMediaFilePick: boolean;
  /** A picked media file waiting to be added to the project through the backend. */
  chosenMediaFile: PickedMediaFile | null;
  theme: ThemeState;
};

export const initialAppState: AppState = {
  player: initialPlayerState,
  chosenSubtitleFile: null,
  preferences: {},
  preferencesLoaded: false,
  pendingFilePick: false,
  currentMediaFileId: null,
  pendingMediaFilePick: false,
  chosenMediaFile: null,
  theme: initialThemeState,
};
