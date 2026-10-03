import type { TextSource } from "@easyimmerse/types";

export type PickedFile = { name: string; source: TextSource };

/** Every side effect the app can perform. Each platform implements it; tests use a recording fake. */
export interface Effects {
  seekPlayer(seconds: number): void;
  pickFile(accept: readonly string[]): Promise<PickedFile | null>;
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
