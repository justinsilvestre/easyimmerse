import type { PreferenceKey } from "./appState.ts";

/** A description of a side effect to perform. Effects are plain data and contain no code. */
export type Effect =
  | { type: "seekPlayer"; seconds: number }
  | { type: "pickFile"; accept: readonly string[] }
  | { type: "savePreference"; key: PreferenceKey; value: string }
  | { type: "loadPreference"; key: PreferenceKey }
  | { type: "showNotification"; message: string }
  | { type: "copyToClipboard"; text: string }
  | { type: "openExternalUrl"; url: string };
