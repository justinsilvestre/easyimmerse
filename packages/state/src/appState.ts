import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "./effects.ts";
import type { ReaderLocation } from "./readingLocation.ts";
import type { Theme } from "./theme.ts";

export type PreferenceKey =
  | "showTranslations"
  | "textScale"
  | "losslessAudio"
  | "conversionNoticeDismissed"
  /** The reader's appearance, as JSON. */
  | "readerPreferences"
  /** The theme the user chose: "light", "dark", or anything else for the system's. */
  | "theme";

export const preferenceKeys: readonly PreferenceKey[] = [
  "showTranslations",
  "textScale",
  "losslessAudio",
  "conversionNoticeDismissed",
  "readerPreferences",
  "theme",
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
  /** A picked media file waiting to be added to the project through the backend. */
  chosenMediaFile: PickedMediaFile | null;
  /** A picked dictionary file waiting to be imported through the backend. */
  chosenDictionaryFile: PickedDictionaryFile | null;
  /** How many pieces of work closing the app would lose, such as flashcard saves under way or unsaved changes in the editor. */
  unsavedWorkCount: number;
  /** The operating system's theme, which the app shows unless the user chose one. */
  systemTheme: Theme;
  /**
   * The last reading place in each book opened since the app started, by media file id.
   * Null for a book with no stored place; absent until the stored place has been read.
   */
  readingLocations: Partial<Record<string, ReaderLocation | null>>;
};

export const initialAppState: AppState = {
  player: initialPlayerState,
  chosenSubtitleFile: null,
  preferences: {},
  preferencesLoaded: false,
  pendingFilePick: false,
  currentMediaFileId: null,
  chosenMediaFile: null,
  chosenDictionaryFile: null,
  unsavedWorkCount: 0,
  systemTheme: "light",
  readingLocations: {},
};
