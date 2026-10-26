import type {
  Definition,
  DesktopServerSettings,
  DesktopServerStatus,
  MediaFileSource,
  PairingGrant,
  ServerAuthInfo,
  ServerLogEntry,
  SessionCreated,
  TextSource,
} from "@easyimmerse/types";
import type { SignInAttempt, SignInOutcome } from "../account/signInAttempt.ts";
import type { PairingScan } from "../pairing/pairingScan.ts";
import type { Appearance } from "../preferences/appearance.ts";
import type { Theme } from "../preferences/theme.ts";
import type { LocationWrite } from "../route/routeEffect.ts";
import type { ServerConfig } from "../server/serverState.ts";
import type { Clock } from "../timers/clock.ts";

export type PickedFile = { name: string; source: TextSource };

/** A media file the user picked, described as the backend stores it. The bytes stay with the platform. */
export type PickedMediaFile = { name: string; source: MediaFileSource };

/**
 * A dictionary file the user picked. A desktop platform names its path for the server to read;
 * a browser keeps the file in its file registry, where the source finds it.
 */
export type PickedDictionaryFile = { name: string; source: MediaFileSource };

/**
 * Where the user chose to save a file: a path, a cancelled dialog, or a platform that has no save dialog and downloads the file instead.
 * A `staging` path lies inside the app: the platform lets the user choose where to keep a copy once the file is written there.
 */
export type SavePathPick =
  | { kind: "path"; path: string }
  | { kind: "staging"; path: string }
  | { kind: "cancelled" }
  | { kind: "unsupported" };

/** Whether the user kept a copy of a staged file or cancelled. */
export type SaveCopyOutcome = { kind: "saved" } | { kind: "cancelled" };

/** What the browser answers when asked about media support. */
export type PlaybackProbes = {
  userAgent: string;
  /** A media element's `canPlayType`: "", "maybe", or "probably". */
  canPlayType: (mimeType: string) => string;
  /** `MediaSource.isTypeSupported` or `ManagedMediaSource.isTypeSupported`, or null when the page has neither. */
  isTypeSupported: ((mimeType: string) => boolean) | null;
};

/** Every side effect the app can perform. Each platform implements it; tests use a recording fake. */
export interface Effects {
  /** The clock through which the store waits for its timers. */
  clock: Clock;
  seekPlayer(seconds: number): void;
  /** Pauses the player when it plays, and plays it otherwise. */
  togglePlayer(): void;
  /** Plays the player, and does nothing when it already plays. */
  playPlayer(): void;
  /** Pauses the player, and does nothing when it is already paused. */
  pausePlayer(): void;
  setPlayerVolume(volume: number): void;
  setPlayerMuted(isMuted: boolean): void;
  setPlayerSpeed(speed: number): void;
  pickFile(accept: readonly string[]): Promise<PickedFile | null>;
  pickMediaFile(accept: readonly string[]): Promise<PickedMediaFile | null>;
  pickDictionaryFile(
    accept: readonly string[],
  ): Promise<PickedDictionaryFile | null>;
  /** Asks where to save a file, suggesting a name. A platform without a save dialog answers `unsupported`. */
  pickSavePath(suggestedFileName: string): Promise<SavePathPick>;
  /**
   * Lets the user choose where to keep a copy of the file written at a staging path, suggesting the name, and removes the staged file.
   * Only a platform that answers `staging` to `pickSavePath` is asked to.
   */
  saveCopy(path: string, fileName: string): Promise<SaveCopyOutcome>;
  /** Hands a file to the user as a download. Only a platform that answers `unsupported` to `pickSavePath` is asked to. */
  downloadFile(fileName: string, bytes: Uint8Array<ArrayBuffer>): void;
  /** Reads how the platform's media element and Media Source Extensions answer questions about formats. */
  readPlaybackProbes(): PlaybackProbes;
  /**
   * Writes a dictionary definition as the Markdown a flashcard field holds, following the form in which the app renders it.
   * Its markup is read with the platform's own parser, which is why the platform provides it.
   */
  writeDefinitionMarkdown(definition: Definition): string;
  savePreference(key: string, value: string): Promise<void>;
  loadPreference(key: string): Promise<string | null>;
  /** Keeps a value in this device's own storage, whichever server the app talks to. */
  saveOnDevice(key: string, value: string): Promise<void>;
  /** Reads a value kept in this device's own storage, or null when none is kept. */
  loadFromDevice(key: string): Promise<string | null>;
  openExternalUrl(url: string): void;
  /** Copies text to the clipboard; rejects when the platform refuses. */
  copyText(text: string): Promise<void>;
  /**
   * Warns before the app or its page closes while `isActive`, as while a flashcard is being saved or has unsaved changes.
   * Where closing cannot be held back, as on a phone, it does nothing.
   */
  guardClose(isActive: boolean): void;
  /**
   * Calls the listener whenever the platform asks for the Settings screen, as a desktop menu item does.
   * Returns a function that stops the calls.
   */
  subscribeToSettingsRequests(listener: () => void): () => void;
  /**
   * Shows the path and query in the address bar, as a new entry of the browser's history or in place of the current one.
   * A platform without an address bar does nothing.
   */
  writeLocation(path: string, write: LocationWrite): void;
  /**
   * Calls the listener with the path and query the address bar shows, at once where the platform has one,
   * and again whenever the browser's Back or Forward returns to another entry. A platform without an address bar never calls it.
   * Returns a function that stops the calls.
   */
  subscribeToLocation(listener: (path: string) => void): () => void;
  /**
   * Calls the listener with each link from outside the app that the operating system opens the app with, such as an `easyimmerse://` link:
   * the one that started the app, and each one opened while it runs. Each link reaches the listener once.
   * A platform that no link opens never calls it.
   * Returns a function that stops the calls.
   */
  subscribeToOpenedLinks(listener: (link: string) => void): () => void;
  /** Shows the document in the given theme and at the given text scale. */
  applyAppearance(appearance: Appearance): void;
  /**
   * Calls the listener with the operating system's light or dark theme, at once where the platform can tell it, and again whenever it changes.
   * Returns a function that stops the calls.
   */
  subscribeToSystemTheme(listener: (theme: Theme) => void): () => void;
  /** Asks the server at the address what it offers for signing in. Never rejects. */
  fetchServerAuthInfo(
    serverUrl: string,
  ): Promise<SignInOutcome<ServerAuthInfo>>;
  /** Logs in to the attempt's server, or signs up on it, and resolves with the session it opens. Never rejects. */
  createSession(attempt: SignInAttempt): Promise<SignInOutcome<SessionCreated>>;
  /**
   * Makes the app talk to the server with the token from now on, which starts the app anew.
   * Resolves with a failure when the platform cannot keep the server, and never rejects.
   */
  connectToServer(server: ServerConfig): Promise<SignInOutcome<null>>;
  /** Makes the app run offline from now on, forgetting the server it was connected to, which starts the app anew. */
  disconnectFromServer(): void;
  /** Exchanges a pairing code for the token of the server at the address. Never rejects. */
  claimPairingCode(
    serverUrl: string,
    code: string,
  ): Promise<SignInOutcome<PairingGrant>>;
  /**
   * Reads a QR code with the platform's own scanner and resolves with the text it holds,
   * or with why it read none: the person closed the scanner, or the platform has no camera it may use. Never rejects.
   */
  scanPairingCode(): Promise<PairingScan>;
  /**
   * Opens the platform's file dialog for a program and resolves with its path, or with null when the person cancelled
   * or the platform has no such dialog.
   */
  pickExecutable(): Promise<string | null>;
  /**
   * The desktop app's server controls. Each rejects with the reason as an error's message when the controls refuse,
   * and in an app without them.
   */
  readDesktopServerSettings(): Promise<DesktopServerSettings>;
  /** Saves the settings, restarting the server when a change needs it, and resolves with its status afterwards. */
  saveDesktopServerSettings(
    settings: DesktopServerSettings,
  ): Promise<DesktopServerStatus>;
  startDesktopServer(): Promise<DesktopServerStatus>;
  stopDesktopServer(): Promise<DesktopServerStatus>;
  readDesktopServerStatus(): Promise<DesktopServerStatus>;
  /** Reads the server's recent log records, oldest first. */
  readDesktopServerLogs(): Promise<readonly ServerLogEntry[]>;
  /**
   * Calls the listener with the server's status whenever it changes. An app without server controls never calls it.
   * Returns a function that stops the calls.
   */
  subscribeToDesktopServerStatus(
    listener: (status: DesktopServerStatus) => void,
  ): () => void;
  /** Confirms an account's email address on the server at the address, with the token of the link mailed to it. Never rejects. */
  confirmEmail(serverUrl: string, token: string): Promise<SignInOutcome<null>>;
  /** Asks the server at the address to mail a link that lets the account with the email address choose a new password. Never rejects. */
  requestPasswordReset(
    serverUrl: string,
    email: string,
  ): Promise<SignInOutcome<null>>;
  /**
   * Sets an account's new password on the server at the address, with the token of the link mailed for a reset,
   * and resolves with the session it opens. Never rejects.
   */
  setNewPassword(
    serverUrl: string,
    token: string,
    password: string,
  ): Promise<SignInOutcome<SessionCreated>>;
}
