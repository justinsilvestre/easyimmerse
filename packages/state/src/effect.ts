import type { PreferenceKey } from "./appState.ts";
import type { PlayerCommand } from "./playerRegistry.ts";

/** A description of a side effect to perform. Effects are plain data and contain no code. */
export type Effect =
  | { type: "seekPlayer"; seconds: number }
  | { type: "controlPlayer"; command: PlayerCommand }
  | { type: "pickFile"; accept: readonly string[] }
  | { type: "pickMediaFile"; accept: readonly string[] }
  | { type: "pickDictionaryFile" }
  | { type: "savePreference"; key: PreferenceKey; value: string }
  | { type: "loadPreferences"; keys: readonly PreferenceKey[] }
  | { type: "showNotification"; message: string }
  | { type: "copyToClipboard"; text: string }
  | { type: "openExternalUrl"; url: string };
