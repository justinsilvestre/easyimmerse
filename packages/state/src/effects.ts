import type { MediaFileSource, TextSource } from "@easyimmerse/types";

export type PickedFile = { name: string; source: TextSource };

/** A media file the user picked, described as the backend stores it. The bytes stay with the platform. */
export type PickedMediaFile = { name: string; source: MediaFileSource };

/**
 * A dictionary file the user picked. A desktop platform names its path for the server to read;
 * a browser keeps the file in its file registry, where the source finds it.
 */
export type PickedDictionaryFile = { name: string; source: MediaFileSource };

/** Every side effect the app can perform. Each platform implements it; tests use a recording fake. */
export interface Effects {
  seekPlayer(seconds: number): void;
  /** Pauses the player when it plays, and plays it otherwise. */
  togglePlayer(): void;
  /** Plays the player, and does nothing when it already plays. */
  playPlayer(): void;
  /** Pauses the player, and does nothing when it is already paused. */
  pausePlayer(): void;
  setPlayerVolume(volume: number): void;
  setPlayerSpeed(speed: number): void;
  pickFile(accept: readonly string[]): Promise<PickedFile | null>;
  pickMediaFile(accept: readonly string[]): Promise<PickedMediaFile | null>;
  pickDictionaryFile(
    accept: readonly string[],
  ): Promise<PickedDictionaryFile | null>;
  savePreference(key: string, value: string): Promise<void>;
  loadPreference(key: string): Promise<string | null>;
  showNotification(message: string): void;
  openExternalUrl(url: string): void;
  /**
   * Warns before the app or its page closes while `isActive`, as while a flashcard is being saved.
   * Where closing cannot be held back, as on a phone, it does nothing.
   */
  guardClose(isActive: boolean): void;
  /**
   * Calls the listener whenever the platform asks for the Settings screen, as a desktop menu item does.
   * Returns a function that stops the calls.
   */
  subscribeToSettingsRequests(listener: () => void): () => void;
}
