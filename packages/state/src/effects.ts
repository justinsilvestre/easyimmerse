import type { MediaFileSource, TextSource } from "@easyimmerse/types";

export type PickedFile = { name: string; source: TextSource };

/** A media file the user picked, described as the backend stores it. The bytes stay with the platform. */
export type PickedMediaFile = { name: string; source: MediaFileSource };

/** Every side effect the app can perform. Each platform implements it; tests use a recording fake. */
export interface Effects {
  seekPlayer(seconds: number): void;
  pickFile(accept: readonly string[]): Promise<PickedFile | null>;
  pickMediaFile(accept: readonly string[]): Promise<PickedMediaFile | null>;
  savePreference(key: string, value: string): Promise<void>;
  loadPreference(key: string): Promise<string | null>;
  showNotification(message: string): void;
  copyToClipboard(text: string): Promise<void>;
  openExternalUrl(url: string): void;
}
