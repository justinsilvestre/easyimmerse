import type { ManualClock } from "../timers/manualClock.ts";
import { createManualClock } from "../timers/manualClock.ts";
import type {
  Effects,
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
  PlaybackProbes,
} from "./effects.ts";

/** The recording effects' answers about media support: a WebKit browser that plays MP4 directly and through Media Source Extensions. */
const recordedPlaybackProbes: PlaybackProbes = {
  userAgent: "AppleWebKit/605.1.15 (KHTML, like Gecko)",
  canPlayType: (mimeType) => (mimeType.startsWith("video/mp4") ? "maybe" : ""),
  isTypeSupported: (mimeType) => mimeType.includes("mp4"),
};

type EffectCall =
  | { type: "seekPlayer"; seconds: number }
  | { type: "togglePlayer" }
  | { type: "playPlayer" }
  | { type: "pausePlayer" }
  | { type: "setPlayerVolume"; volume: number }
  | { type: "setPlayerMuted"; isMuted: boolean }
  | { type: "setPlayerSpeed"; speed: number }
  | { type: "pickFile"; accept: readonly string[] }
  | { type: "pickMediaFile"; accept: readonly string[] }
  | { type: "pickDictionaryFile"; accept: readonly string[] }
  | { type: "savePreference"; key: string; value: string }
  | { type: "loadPreference"; key: string }
  | { type: "openExternalUrl"; url: string }
  | { type: "guardClose"; isActive: boolean };

export type RecordingEffects = Effects & {
  /** A clock that moves only through `advanceBy`, so no timer fires on its own or outlives its test. */
  clock: ManualClock;
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
  /** Lets the preference loads held so far, and every later one, read the preference store. */
  releasePreferenceLoads(): void;
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

/**
 * Builds an Effects implementation for tests that records calls instead of performing them, over a preference store holding the given values.
 * While `holdsPreferenceLoads` is true, a preference load waits until the test calls `releasePreferenceLoads`.
 */
export function createRecordingEffects(
  storedPreferences: Record<string, string> = {},
  holdsPreferenceLoads = false,
): RecordingEffects {
  const calls: EffectCall[] = [];
  const preferences = new Map(Object.entries(storedPreferences));
  const preferenceLoads = Promise.withResolvers<void>();
  if (!holdsPreferenceLoads) preferenceLoads.resolve();
  const filePick = createPendingPick<PickedFile>("file pick");
  const mediaFilePick = createPendingPick<PickedMediaFile>("media file pick");
  const dictionaryFilePick = createPendingPick<PickedDictionaryFile>(
    "dictionary file pick",
  );
  const settingsListeners = new Set<() => void>();
  return {
    clock: createManualClock(),
    calls,
    preferences,
    seekPlayer: (seconds) => {
      calls.push({ type: "seekPlayer", seconds });
    },
    togglePlayer: () => {
      calls.push({ type: "togglePlayer" });
    },
    playPlayer: () => {
      calls.push({ type: "playPlayer" });
    },
    pausePlayer: () => {
      calls.push({ type: "pausePlayer" });
    },
    setPlayerVolume: (volume) => {
      calls.push({ type: "setPlayerVolume", volume });
    },
    setPlayerMuted: (isMuted) => {
      calls.push({ type: "setPlayerMuted", isMuted });
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
    readPlaybackProbes: () => recordedPlaybackProbes,
    savePreference: async (key, value) => {
      calls.push({ type: "savePreference", key, value });
      preferences.set(key, value);
    },
    loadPreference: async (key) => {
      calls.push({ type: "loadPreference", key });
      await preferenceLoads.promise;
      return preferences.get(key) ?? null;
    },
    openExternalUrl: (url) => {
      calls.push({ type: "openExternalUrl", url });
    },
    guardClose: (isActive) => {
      calls.push({ type: "guardClose", isActive });
    },
    subscribeToSettingsRequests: (listener) => {
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
    releasePreferenceLoads: () => preferenceLoads.resolve(),
  };
}
