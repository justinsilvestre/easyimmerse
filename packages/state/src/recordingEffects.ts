import type { MediaFile, TimeRange } from "@easyimmerse/types";
import type { Effects } from "./effects.ts";
import type { FilePickPurpose, PickedFile } from "./filePick/chosenFile.ts";

export type EffectCall =
  | { type: "seekPlayer"; ms: number }
  | { type: "playPlayer" }
  | { type: "pausePlayer" }
  | { type: "setPlayerLoop"; range: TimeRange | null }
  | { type: "setPlaybackRate"; rate: number }
  | { type: "setVolume"; volume: number }
  | { type: "captureFrame" }
  | { type: "pickFile"; purpose: FilePickPurpose; accept: readonly string[] }
  | { type: "resolveMediaUrl"; projectId: string; media: MediaFile }
  | { type: "readStoredFileText"; key: string }
  | { type: "readStoredFileBytes"; key: string }
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
  /** The texts readStoredFileText returns, by key. It rejects for a key not in the map. Tests may seed it. */
  storedFileTexts: Map<string, string>;
  /** The bytes readStoredFileBytes returns, by key. It rejects for a key not in the map. Tests may seed it. */
  storedFileBytes: Map<string, Uint8Array>;
  /** What captureFrame resolves. Null until a test sets it. */
  frameDataUrl: string | null;
  /** Settles the pending pickFile promise. Throws when no pick is pending. */
  resolvePickFile(file: PickedFile | null): void;
  /** Rejects the pending pickFile promise. Throws when no pick is pending. */
  rejectPickFile(error: Error): void;
};

type PendingPick = {
  resolve: (file: PickedFile | null) => void;
  reject: (error: Error) => void;
};

/** Builds an Effects implementation for tests that records calls instead of performing them. resolveMediaUrl resolves `blob:test`. */
export function createRecordingEffects(): RecordingEffects {
  const calls: EffectCall[] = [];
  const record = (call: EffectCall) => {
    calls.push(call);
  };
  let pendingPick: PendingPick | null = null;
  function takePendingPick(): PendingPick {
    if (pendingPick === null) throw new Error("No file pick is pending.");
    const pick = pendingPick;
    pendingPick = null;
    return pick;
  }
  const effects: RecordingEffects = {
    calls,
    preferences: new Map(),
    storedFileTexts: new Map(),
    storedFileBytes: new Map(),
    frameDataUrl: null,
    seekPlayer: (ms) => record({ type: "seekPlayer", ms }),
    playPlayer: () => record({ type: "playPlayer" }),
    pausePlayer: () => record({ type: "pausePlayer" }),
    setPlayerLoop: (range) => record({ type: "setPlayerLoop", range }),
    setPlaybackRate: (rate) => record({ type: "setPlaybackRate", rate }),
    setVolume: (volume) => record({ type: "setVolume", volume }),
    captureFrame: async () => {
      record({ type: "captureFrame" });
      return effects.frameDataUrl;
    },
    pickFile: (purpose, accept) => {
      record({ type: "pickFile", purpose, accept });
      return new Promise((resolve, reject) => {
        pendingPick = { resolve, reject };
      });
    },
    resolveMediaUrl: async (projectId, media) => {
      record({ type: "resolveMediaUrl", projectId, media });
      return "blob:test";
    },
    readStoredFileText: async (key) => {
      record({ type: "readStoredFileText", key });
      const text = effects.storedFileTexts.get(key);
      if (text === undefined) throw new Error(`Nothing is stored at ${key}.`);
      return text;
    },
    readStoredFileBytes: async (key) => {
      record({ type: "readStoredFileBytes", key });
      const bytes = effects.storedFileBytes.get(key);
      if (bytes === undefined) throw new Error(`Nothing is stored at ${key}.`);
      return bytes;
    },
    savePreference: async (key, value) => {
      record({ type: "savePreference", key, value });
      effects.preferences.set(key, value);
    },
    loadPreference: async (key) => {
      record({ type: "loadPreference", key });
      return effects.preferences.get(key) ?? null;
    },
    showNotification: (message) =>
      record({ type: "showNotification", message }),
    copyToClipboard: async (text) => record({ type: "copyToClipboard", text }),
    openExternalUrl: (url) => record({ type: "openExternalUrl", url }),
    resolvePickFile: (file) => takePendingPick().resolve(file),
    rejectPickFile: (error) => takePendingPick().reject(error),
  };
  return effects;
}
