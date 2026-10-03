import type { Effects, PickedFile } from "./effects.ts";

export type EffectCall =
  | { type: "seekPlayer"; seconds: number }
  | { type: "pickFile"; accept: readonly string[] }
  | { type: "savePreference"; key: string; value: string }
  | { type: "loadPreference"; key: string }
  | { type: "showNotification"; message: string }
  | { type: "copyToClipboard"; text: string }
  | { type: "openExternalUrl"; url: string }
  | { type: "subscribeToSettingsRequests" };

export type RecordingEffects = Effects & {
  /** Every call made so far, in order, with its arguments. */
  calls: EffectCall[];
  /** The store behind savePreference and loadPreference. Tests may seed it. */
  preferences: Map<string, string>;
  /** Settles the pending pickFile promise. Throws when no pick is pending. */
  resolvePickFile(file: PickedFile | null): void;
  /** Rejects the pending pickFile promise. Throws when no pick is pending. */
  rejectPickFile(error: Error): void;
  /** Acts as the platform asking for the Settings screen, by calling every subscribed listener. */
  requestSettings(): void;
};

type PendingPick = {
  resolve: (file: PickedFile | null) => void;
  reject: (error: Error) => void;
};

/** Builds an Effects implementation for tests that records calls instead of performing them. */
export function createRecordingEffects(): RecordingEffects {
  const calls: EffectCall[] = [];
  const preferences = new Map<string, string>();
  let pendingPick: PendingPick | null = null;
  const settingsListeners = new Set<() => void>();
  function takePendingPick(): PendingPick {
    if (pendingPick === null) throw new Error("No file pick is pending.");
    const pick = pendingPick;
    pendingPick = null;
    return pick;
  }
  return {
    calls,
    preferences,
    seekPlayer: (seconds) => {
      calls.push({ type: "seekPlayer", seconds });
    },
    pickFile: (accept) => {
      calls.push({ type: "pickFile", accept });
      return new Promise((resolve, reject) => {
        pendingPick = { resolve, reject };
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
    subscribeToSettingsRequests: (listener) => {
      calls.push({ type: "subscribeToSettingsRequests" });
      settingsListeners.add(listener);
      return () => settingsListeners.delete(listener);
    },
    resolvePickFile: (file) => {
      takePendingPick().resolve(file);
    },
    rejectPickFile: (error) => {
      takePendingPick().reject(error);
    },
    requestSettings: () => {
      for (const listener of settingsListeners) listener();
    },
  };
}
