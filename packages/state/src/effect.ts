import type { MediaFile } from "@easyimmerse/types";
import type { FilePickPurpose } from "./filePick/chosenFile.ts";
import type { PlayerLoop } from "./player/playerLoop.ts";
import type { PreferenceKey } from "./preferences/preferenceKey.ts";

/** A description of a side effect to perform. Effects are plain data and contain no code. */
export type Effect =
  | { type: "seekPlayer"; ms: number }
  | { type: "playPlayer" }
  | { type: "pausePlayer" }
  | { type: "setPlayerLoop"; loop: PlayerLoop | null }
  | { type: "setPlaybackRate"; rate: number }
  | { type: "setVolume"; volume: number }
  | { type: "captureFrame" }
  | { type: "pickFile"; purpose: FilePickPurpose; accept: readonly string[] }
  | { type: "resolveMediaPlayback"; projectId: string; media: MediaFile }
  | { type: "readStoredFileText"; trackId: string; key: string }
  | { type: "readStoredFileBytes"; key: string; target: StoredFileTarget }
  | { type: "savePreference"; key: PreferenceKey; value: string }
  | { type: "loadPreference"; key: PreferenceKey }
  | { type: "showNotification"; message: string }
  | { type: "copyToClipboard"; text: string }
  | { type: "openExternalUrl"; url: string };

/** What the bytes of a stored file are read for: the chosen file, or the open document. */
export type StoredFileTarget =
  | { kind: "chosenFile" }
  | { kind: "document"; mediaId: string };
