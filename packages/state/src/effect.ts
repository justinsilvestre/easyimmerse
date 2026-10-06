import type { PreferenceKey } from "./appState.ts";
import type { ReaderLocation } from "./readingLocation.ts";

/** A description of a side effect to perform. Effects are plain data and contain no code. */
export type Effect =
  | { type: "seekPlayer"; seconds: number }
  | { type: "togglePlayer" }
  | { type: "playPlayer" }
  | { type: "pausePlayer" }
  | { type: "setPlayerVolume"; volume: number }
  | { type: "setPlayerSpeed"; speed: number }
  | { type: "pickFile"; accept: readonly string[] }
  | { type: "pickMediaFile"; accept: readonly string[] }
  | { type: "pickDictionaryFile"; accept: readonly string[] }
  | { type: "savePreference"; key: PreferenceKey; value: string }
  | { type: "loadPreferences"; keys: readonly PreferenceKey[] }
  | { type: "loadReadingLocation"; mediaFileId: string }
  | {
      type: "saveReadingLocation";
      mediaFileId: string;
      location: ReaderLocation;
    }
  | { type: "showNotification"; message: string }
  | { type: "openExternalUrl"; url: string }
  | { type: "guardClose"; isActive: boolean };
