import type { MediaFileSource, TextSource } from "@easyimmerse/types";
import type { PlayerCommand } from "./playerRegistry.ts";

export type PickedFile = { name: string; source: TextSource };

/** A media file the user picked, described as the backend stores it. The bytes stay with the platform. */
export type PickedMediaFile = { name: string; source: MediaFileSource };

/**
 * A dictionary archive the user picked. A browser hands over its bytes; a desktop app hands
 * over its path for the server to read.
 */
export type PickedDictionaryFile = {
  name: string;
  source: { kind: "bytes"; bytes: Uint8Array } | { kind: "path"; path: string };
};

/** Every side effect the app can perform. Each platform implements it; tests use a recording fake. */
export interface Effects {
  seekPlayer(seconds: number): void;
  controlPlayer(command: PlayerCommand): void;
  pickFile(accept: readonly string[]): Promise<PickedFile | null>;
  pickMediaFile(accept: readonly string[]): Promise<PickedMediaFile | null>;
  pickDictionaryFile(): Promise<PickedDictionaryFile | null>;
  savePreference(key: string, value: string): Promise<void>;
  loadPreference(key: string): Promise<string | null>;
  showNotification(message: string): void;
  copyToClipboard(text: string): Promise<void>;
  openExternalUrl(url: string): void;
  /**
   * Calls the listener whenever the platform asks for the Settings screen, as a desktop menu item does.
   * Returns a function that stops the calls.
   */
  subscribeToSettingsRequests(listener: () => void): () => void;
}
