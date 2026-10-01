import type { MediaFile, TimeRange } from "@easyimmerse/types";
import type { FilePickPurpose, PickedFile } from "./filePick/chosenFile.ts";

/** Every side effect the app can perform. Each platform implements it; tests use a recording fake. Media times are in milliseconds. */
export interface Effects {
  seekPlayer(ms: number): void;
  playPlayer(): void;
  pausePlayer(): void;
  /** Makes the player repeat the range, or stop repeating when given null. */
  setPlayerLoop(range: TimeRange | null): void;
  setPlaybackRate(rate: number): void;
  /** Sets the volume, from 0 to 1. */
  setVolume(volume: number): void;
  /** Resolves a PNG data URL of the current video frame, or null when there is no frame to capture. */
  captureFrame(): Promise<string | null>;
  /** Opens a file dialog. Resolves null when the user cancels. */
  pickFile(
    purpose: FilePickPurpose,
    accept: readonly string[],
  ): Promise<PickedFile | null>;
  /** Resolves a URL the player can load the media from. */
  resolveMediaUrl(projectId: string, media: MediaFile): Promise<string>;
  /** Reads the text of a file the browser stored under the key. */
  readStoredFileText(key: string): Promise<string>;
  savePreference(key: string, value: string): Promise<void>;
  loadPreference(key: string): Promise<string | null>;
  showNotification(message: string): void;
  copyToClipboard(text: string): Promise<void>;
  openExternalUrl(url: string): void;
}
