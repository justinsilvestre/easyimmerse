import type { PreferenceKey } from "./appState.ts";

/** A description of a side effect to perform. Effects are plain data and contain no code. */
export type Effect =
  | { type: "seekPlayer"; seconds: number }
  | { type: "togglePlayer" }
  | { type: "setPlayerVolume"; volume: number }
  | { type: "setPlayerSpeed"; speed: number }
  | { type: "pickFile"; accept: readonly string[] }
  | { type: "pickMediaFile"; accept: readonly string[] }
  | { type: "pickDictionaryFile"; accept: readonly string[] }
  | { type: "savePreference"; key: PreferenceKey; value: string }
  | { type: "loadPreferences"; keys: readonly PreferenceKey[] }
  | { type: "showNotification"; message: string }
  | { type: "openExternalUrl"; url: string };
