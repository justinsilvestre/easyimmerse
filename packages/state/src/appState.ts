import type { TextSource } from "@easyimmerse/types";
import type { ThemeState } from "./theme.ts";
import { initialThemeState } from "./theme.ts";

export type PreferenceKey =
  | "showTranslations"
  | "losslessAudio"
  | "conversionNoticeDismissed";

export const preferenceKeys: readonly PreferenceKey[] = [
  "showTranslations",
  "losslessAudio",
  "conversionNoticeDismissed",
];

export type AppState = {
  player: { currentTimeSeconds: number };
  /** The text the subtitles panel parses. Null until a file is chosen. */
  subtitleSource: TextSource | null;
  preferences: Partial<Record<PreferenceKey, string>>;
  pendingFilePick: boolean;
  theme: ThemeState;
};

export const initialAppState: AppState = {
  player: { currentTimeSeconds: 0 },
  subtitleSource: null,
  preferences: {},
  pendingFilePick: false,
  theme: initialThemeState,
};
