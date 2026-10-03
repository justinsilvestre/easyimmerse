import type { TextSource } from "@easyimmerse/types";
import type { PickedMediaFile } from "./effects.ts";
import type { ThemeState } from "./theme.ts";
import { initialThemeState } from "./theme.ts";

export type PreferenceKey = "showTranslations";

export const preferenceKeys: readonly PreferenceKey[] = ["showTranslations"];

export type AppState = {
  player: { currentTimeSeconds: number };
  /** The text the subtitles panel parses. Null until a file is chosen. */
  subtitleSource: TextSource | null;
  preferences: Partial<Record<PreferenceKey, string>>;
  pendingFilePick: boolean;
  /** The media file the media screen shows. Null until one is opened. */
  currentMediaFileId: string | null;
  pendingMediaFilePick: boolean;
  /** A picked media file waiting to be added to the project through the backend. */
  chosenMediaFile: PickedMediaFile | null;
  theme: ThemeState;
};

export const initialAppState: AppState = {
  player: { currentTimeSeconds: 0 },
  subtitleSource: null,
  preferences: {},
  pendingFilePick: false,
  currentMediaFileId: null,
  pendingMediaFilePick: false,
  chosenMediaFile: null,
  theme: initialThemeState,
};
