import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "./effects.ts";
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

/** Which subtitles a subtitles file is added as: the language being learned, or its translation. */
export type SubtitleRole = "target" | "translation";

/** The player as its media element last reported it. Volume is 0 to 1; the rate is a speed multiplier. */
export type PlayerState = {
  /** Zero until the player has loaded a file. */
  durationSeconds: number;
  currentTimeSeconds: number;
  isPlaying: boolean;
  volume: number;
  rate: number;
};

/** The languages a dictionary file is imported under, as BCP 47 codes: that of its words and that of its definitions. */
export type DictionaryLanguages = {
  sourceLanguage: string;
  targetLanguage: string;
};

export type AppState = {
  player: PlayerState;
  /** The role a subtitles file is being picked for. Null while no pick is pending. */
  pendingSubtitlePick: SubtitleRole | null;
  /** A picked subtitles file waiting to be added to the open media file. */
  chosenSubtitleFile: { file: PickedFile; role: SubtitleRole } | null;
  preferences: Partial<Record<PreferenceKey, string>>;
  /** False until the preferences stored on the device have been read once. */
  preferencesLoaded: boolean;
  /** The media file the media screen shows. Null until one is opened. */
  currentMediaFileId: string | null;
  pendingMediaFilePick: boolean;
  /** A picked media file waiting to be added to the project through the backend. */
  chosenMediaFile: PickedMediaFile | null;
  /** The languages a dictionary file is being picked for. Null while no pick is pending. */
  pendingDictionaryPick: DictionaryLanguages | null;
  /** A picked dictionary file waiting to be imported through the backend. */
  chosenDictionaryFile: {
    file: PickedDictionaryFile;
    languages: DictionaryLanguages;
  } | null;
  /** The name of the last dictionary file the backend could not read, until the user dismisses the notice. */
  unsupportedDictionaryFile: string | null;
  theme: ThemeState;
};

export const initialPlayerState: PlayerState = {
  durationSeconds: 0,
  currentTimeSeconds: 0,
  isPlaying: false,
  volume: 1,
  rate: 1,
};

export const initialAppState: AppState = {
  player: initialPlayerState,
  pendingSubtitlePick: null,
  chosenSubtitleFile: null,
  preferences: {},
  preferencesLoaded: false,
  currentMediaFileId: null,
  pendingMediaFilePick: false,
  chosenMediaFile: null,
  pendingDictionaryPick: null,
  chosenDictionaryFile: null,
  unsupportedDictionaryFile: null,
  theme: initialThemeState,
};
