import type {
  Effects,
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "./effects.ts";

type EffectCall =
  | { type: "seekPlayer"; seconds: number }
  | { type: "togglePlayer" }
  | { type: "setPlayerVolume"; volume: number }
  | { type: "setPlayerSpeed"; speed: number }
  | { type: "pickFile"; accept: readonly string[] }
  | { type: "pickMediaFile"; accept: readonly string[] }
  | { type: "pickDictionaryFile"; accept: readonly string[] }
  | { type: "savePreference"; key: string; value: string }
  | { type: "loadPreference"; key: string }
  | { type: "showNotification"; message: string }
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
  /** Settles the pending pickMediaFile promise. Throws when no pick is pending. */
  resolvePickMediaFile(file: PickedMediaFile | null): void;
  /** Rejects the pending pickMediaFile promise. Throws when no pick is pending. */
  rejectPickMediaFile(error: Error): void;
  /** Settles the pending pickDictionaryFile promise. Throws when no pick is pending. */
  resolvePickDictionaryFile(file: PickedDictionaryFile | null): void;
  /** Acts as the platform asking for the Settings screen, by calling every subscribed listener. */
  requestSettings(): void;
};

type PendingPick<F> = {
  resolve: (file: F | null) => void;
  reject: (error: Error) => void;
};

/** Holds at most one unsettled promise, handing it out once to whoever settles it. */
function createPendingPick<F>(description: string) {
  let pending: PendingPick<F> | null = null;
  return {
    start: () =>
      new Promise<F | null>((resolve, reject) => {
        pending = { resolve, reject };
      }),
    take: (): PendingPick<F> => {
      if (pending === null) throw new Error(`No ${description} is pending.`);
      const pick = pending;
      pending = null;
      return pick;
    },
  };
}

/** Builds an Effects implementation for tests that records calls instead of performing them. */
export function createRecordingEffects(): RecordingEffects {
  const calls: EffectCall[] = [];
  const preferences = new Map<string, string>();
  const filePick = createPendingPick<PickedFile>("file pick");
  const mediaFilePick = createPendingPick<PickedMediaFile>("media file pick");
  const dictionaryFilePick = createPendingPick<PickedDictionaryFile>(
    "dictionary file pick",
  );
  const settingsListeners = new Set<() => void>();
  return {
    calls,
    preferences,
    seekPlayer: (seconds) => {
      calls.push({ type: "seekPlayer", seconds });
    },
    togglePlayer: () => {
      calls.push({ type: "togglePlayer" });
    },
    setPlayerVolume: (volume) => {
      calls.push({ type: "setPlayerVolume", volume });
    },
    setPlayerSpeed: (speed) => {
      calls.push({ type: "setPlayerSpeed", speed });
    },
    pickFile: (accept) => {
      calls.push({ type: "pickFile", accept });
      return filePick.start();
    },
    pickMediaFile: (accept) => {
      calls.push({ type: "pickMediaFile", accept });
      return mediaFilePick.start();
    },
    pickDictionaryFile: (accept) => {
      calls.push({ type: "pickDictionaryFile", accept });
      return dictionaryFilePick.start();
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
    openExternalUrl: (url) => {
      calls.push({ type: "openExternalUrl", url });
    },
    subscribeToSettingsRequests: (listener) => {
      calls.push({ type: "subscribeToSettingsRequests" });
      settingsListeners.add(listener);
      return () => settingsListeners.delete(listener);
    },
    resolvePickFile: (file) => {
      filePick.take().resolve(file);
    },
    rejectPickFile: (error) => {
      filePick.take().reject(error);
    },
    resolvePickMediaFile: (file) => {
      mediaFilePick.take().resolve(file);
    },
    rejectPickMediaFile: (error) => {
      mediaFilePick.take().reject(error);
    },
    resolvePickDictionaryFile: (file) => {
      dictionaryFilePick.take().resolve(file);
    },
    requestSettings: () => {
      for (const listener of settingsListeners) listener();
    },
  };
}
