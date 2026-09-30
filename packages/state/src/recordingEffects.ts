import type { Effects, PickedFile } from "./effects.ts";

export type EffectCall =
  | { type: "seekPlayer"; seconds: number }
  | { type: "pickFile"; accept: readonly string[] }
  | { type: "savePreference"; key: string; value: string }
  | { type: "loadPreference"; key: string }
  | { type: "showNotification"; message: string }
  | { type: "copyToClipboard"; text: string }
  | { type: "openExternalUrl"; url: string };

export type RecordingEffects = Effects & {
  /** Every call made so far, in order, with its arguments. */
  calls: EffectCall[];
  /** The store behind savePreference and loadPreference. Tests may seed it. */
  preferences: Map<string, string>;
  /** Settles the pending pickFile promise. Throws when no pick is pending. */
  resolvePickFile(file: PickedFile | null): void;
};

/** Builds an Effects implementation for tests that records calls instead of performing them. */
export function createRecordingEffects(): RecordingEffects {
  const calls: EffectCall[] = [];
  const preferences = new Map<string, string>();
  let resolvePendingPick: ((file: PickedFile | null) => void) | null = null;
  return {
    calls,
    preferences,
    seekPlayer: (seconds) => {
      calls.push({ type: "seekPlayer", seconds });
    },
    pickFile: (accept) => {
      calls.push({ type: "pickFile", accept });
      return new Promise((resolve) => {
        resolvePendingPick = resolve;
      });
    },
    savePreference: async (key, value) => {
      calls.push({ type: "savePreference", key, value });
      preferences.set(key, value);
    },
    loadPreference: async (key) => {
      calls.push({ type: "loadPreference", key });
      return preferences.get(key) ?? null;
    },
    showNotification: (message) => {
      calls.push({ type: "showNotification", message });
    },
    copyToClipboard: async (text) => {
      calls.push({ type: "copyToClipboard", text });
    },
    openExternalUrl: (url) => {
      calls.push({ type: "openExternalUrl", url });
    },
    resolvePickFile: (file) => {
      if (resolvePendingPick === null)
        throw new Error("No file pick is pending.");
      resolvePendingPick(file);
      resolvePendingPick = null;
    },
  };
}
