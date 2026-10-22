import type {
  DesktopServerSettings,
  DesktopServerStatus,
  PairingGrant,
  ServerAuthInfo,
  ServerLogEntry,
  SessionCreated,
} from "@easyimmerse/types";
import {
  connectionNotKeptCode,
  type SignInAttempt,
  type SignInOutcome,
} from "../account/signInAttempt.ts";
import type { DefinitionWriter } from "../flashcards/lookupFields.ts";
import type { Appearance } from "../preferences/appearance.ts";
import type { Theme } from "../preferences/theme.ts";
import type { RequestFailure } from "../server/serverRequest.ts";
import type { ServerConfig } from "../server/serverState.ts";
import type { ManualClock } from "../timers/manualClock.ts";
import { createManualClock } from "../timers/manualClock.ts";
import type {
  Effects,
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
  PlaybackProbes,
  SaveCopyOutcome,
  SavePathPick,
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
  | { type: "pickSavePath"; suggestedFileName: string }
  | { type: "saveCopy"; path: string; fileName: string }
  | { type: "downloadFile"; fileName: string; bytes: Uint8Array<ArrayBuffer> }
  | { type: "savePreference"; key: string; value: string }
  | { type: "loadPreference"; key: string }
  | { type: "saveOnDevice"; key: string; value: string }
  | { type: "loadFromDevice"; key: string }
  | { type: "openExternalUrl"; url: string }
  | { type: "copyText"; text: string }
  | { type: "guardClose"; isActive: boolean }
  | { type: "applyAppearance"; appearance: Appearance }
  | { type: "fetchServerAuthInfo"; serverUrl: string }
  | { type: "createSession"; attempt: SignInAttempt }
  | { type: "connectToServer"; server: ServerConfig }
  | { type: "disconnectFromServer" }
  | { type: "claimPairingCode"; serverUrl: string; code: string }
  | { type: "scanPairingCode" }
  | { type: "pickExecutable" }
  | { type: "readDesktopServerSettings" }
  | { type: "saveDesktopServerSettings"; settings: DesktopServerSettings }
  | { type: "startDesktopServer" }
  | { type: "stopDesktopServer" }
  | { type: "readDesktopServerStatus" }
  | { type: "readDesktopServerLogs" };

/** What each of the desktop server controls answers. */
type DesktopServerAnswers = {
  readDesktopServerSettings: DesktopServerSettings;
  saveDesktopServerSettings: DesktopServerStatus;
  startDesktopServer: DesktopServerStatus;
  stopDesktopServer: DesktopServerStatus;
  readDesktopServerStatus: DesktopServerStatus;
  readDesktopServerLogs: readonly ServerLogEntry[];
};

/** A desktop server control, named as the effects name it. */
export type DesktopServerControl = keyof DesktopServerAnswers;

export type RecordingEffects = Effects & {
  /** A clock that moves only through `advanceBy`, so no timer fires on its own or outlives its test. */
  clock: ManualClock;
  /** Every call made so far, in order, with its arguments. */
  calls: EffectCall[];
  /** The store behind savePreference and loadPreference. Tests may seed it. */
  preferences: Map<string, string>;
  /** The store behind saveOnDevice and loadFromDevice. Tests may seed it. */
  deviceValues: Map<string, string>;
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
  /** Settles the pending pickSavePath promise. Throws when no pick is pending. */
  resolvePickSavePath(pick: SavePathPick): void;
  /** Settles the pending saveCopy promise. Throws when no copy is pending. */
  resolveSaveCopy(outcome: SaveCopyOutcome): void;
  /** Rejects the pending saveCopy promise. Throws when no copy is pending. */
  rejectSaveCopy(error: Error): void;
  /** Acts as the platform asking for the Settings screen, by calling every subscribed listener. */
  requestSettings(): void;
  /** Acts as the operating system switching between light and dark, by calling every subscribed listener. */
  changeSystemTheme(theme: Theme): void;
  /** Makes every later copy fail, as a platform that refuses clipboard access does. */
  refuseCopies(): void;
  /** Lets the preference loads held so far, and every later one, read the preference store. */
  releasePreferenceLoads(): void;
  /** Settles the pending fetchServerAuthInfo promise. Throws when no question is pending. */
  resolveServerAuthInfo(outcome: SignInOutcome<ServerAuthInfo>): void;
  /** Settles the pending createSession promise. Throws when no sign-in is pending. */
  resolveSession(outcome: SignInOutcome<SessionCreated>): void;
  /** Makes every later connection to a server fail, as a browser whose storage is full does. */
  refuseConnections(): void;
  /** Settles the pending claimPairingCode promise. Throws when no claim is pending. */
  resolvePairingClaim(outcome: SignInOutcome<PairingGrant>): void;
  /** Settles the pending scanPairingCode promise. Throws when no scan is pending. */
  resolvePairingScan(text: string | null): void;
  /** Settles the pending pickExecutable promise. Throws when no pick is pending. */
  resolvePickExecutable(path: string | null): void;
  /** Settles the pending call of a desktop server control with its answer. Throws when none is pending. */
  resolveDesktopServer<C extends DesktopServerControl>(
    control: C,
    answer: DesktopServerAnswers[C],
  ): void;
  /** Rejects the pending call of a desktop server control with the message. Throws when none is pending. */
  rejectDesktopServer(control: DesktopServerControl, message: string): void;
  /** Acts as the server controls reporting a new status, by calling every subscribed listener. */
  changeDesktopServerStatus(status: DesktopServerStatus): void;
};

type PendingPick<R> = {
  resolve: (answer: R) => void;
  reject: (error: Error) => void;
};

/** Holds at most one unsettled promise, handing it out once to whoever settles it. */
function createPendingPick<R>(description: string) {
  let pending: PendingPick<R> | null = null;
  return {
    start: () =>
      new Promise<R>((resolve, reject) => {
        pending = { resolve, reject };
      }),
    take: (): PendingPick<R> => {
      if (pending === null) throw new Error(`No ${description} is pending.`);
      const pick = pending;
      pending = null;
      return pick;
    },
  };
}

/** The failure of a connection the recording effects refuse. */
const connectionNotKept: RequestFailure = {
  status: "NO_DATA",
  code: connectionNotKeptCode,
  message: "The storage is full.",
};

/** Writes a definition as its plain text, which is all a test of the state needs; the UI's tests pass the app's own writer. */
const plainDefinitionText: DefinitionWriter = (definition) =>
  definition.kind === "text" ? definition.text.trim() : "";

/**
 * Builds an Effects implementation for tests that records calls instead of performing them, over a preference store holding the given values.
 * While `holdsPreferenceLoads` is true, a preference load waits until the test calls `releasePreferenceLoads`.
 * Definitions are written as Markdown by `writeDefinitionMarkdown`, which keeps only plain text unless another writer is given.
 */
export function createRecordingEffects(
  storedPreferences: Record<string, string> = {},
  holdsPreferenceLoads = false,
  writeDefinitionMarkdown: DefinitionWriter = plainDefinitionText,
): RecordingEffects {
  const calls: EffectCall[] = [];
  const preferences = new Map(Object.entries(storedPreferences));
  const deviceValues = new Map<string, string>();
  const preferenceLoads = Promise.withResolvers<void>();
  if (!holdsPreferenceLoads) preferenceLoads.resolve();
  const filePick = createPendingPick<PickedFile | null>("file pick");
  const mediaFilePick = createPendingPick<PickedMediaFile | null>(
    "media file pick",
  );
  const dictionaryFilePick = createPendingPick<PickedDictionaryFile | null>(
    "dictionary file pick",
  );
  const savePathPick = createPendingPick<SavePathPick>("save path pick");
  const copy = createPendingPick<SaveCopyOutcome>("copy");
  const serverAuthInfo = createPendingPick<SignInOutcome<ServerAuthInfo>>(
    "server auth info question",
  );
  const session = createPendingPick<SignInOutcome<SessionCreated>>("sign-in");
  const pairingClaim =
    createPendingPick<SignInOutcome<PairingGrant>>("pairing claim");
  const pairingScan = createPendingPick<string | null>("pairing scan");
  const executablePick = createPendingPick<string | null>("executable pick");
  const desktopServerCalls = createDesktopServerCalls();
  const desktopServerListeners = new Set<
    (status: DesktopServerStatus) => void
  >();
  const settingsListeners = new Set<() => void>();
  const systemThemeListeners = new Set<(theme: Theme) => void>();
  let refusesCopies = false;
  let refusesConnections = false;
  return {
    clock: createManualClock(),
    calls,
    preferences,
    deviceValues,
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
    pickSavePath: (suggestedFileName) => {
      calls.push({ type: "pickSavePath", suggestedFileName });
      return savePathPick.start();
    },
    saveCopy: (path, fileName) => {
      calls.push({ type: "saveCopy", path, fileName });
      return copy.start();
    },
    downloadFile: (fileName, bytes) => {
      calls.push({ type: "downloadFile", fileName, bytes });
    },
    readPlaybackProbes: () => recordedPlaybackProbes,
    writeDefinitionMarkdown,
    savePreference: async (key, value) => {
      calls.push({ type: "savePreference", key, value });
      preferences.set(key, value);
    },
    loadPreference: async (key) => {
      calls.push({ type: "loadPreference", key });
      await preferenceLoads.promise;
      return preferences.get(key) ?? null;
    },
    saveOnDevice: async (key, value) => {
      calls.push({ type: "saveOnDevice", key, value });
      deviceValues.set(key, value);
    },
    loadFromDevice: async (key) => {
      calls.push({ type: "loadFromDevice", key });
      return deviceValues.get(key) ?? null;
    },
    openExternalUrl: (url) => {
      calls.push({ type: "openExternalUrl", url });
    },
    copyText: async (text) => {
      calls.push({ type: "copyText", text });
      if (refusesCopies) throw new Error("The platform refused to copy.");
    },
    guardClose: (isActive) => {
      calls.push({ type: "guardClose", isActive });
    },
    subscribeToSettingsRequests: (listener) => {
      settingsListeners.add(listener);
      return () => settingsListeners.delete(listener);
    },
    applyAppearance: (appearance) => {
      calls.push({ type: "applyAppearance", appearance });
    },
    subscribeToSystemTheme: (listener) => {
      systemThemeListeners.add(listener);
      return () => systemThemeListeners.delete(listener);
    },
    fetchServerAuthInfo: (serverUrl) => {
      calls.push({ type: "fetchServerAuthInfo", serverUrl });
      return serverAuthInfo.start();
    },
    createSession: (attempt) => {
      calls.push({ type: "createSession", attempt });
      return session.start();
    },
    connectToServer: async (server) => {
      calls.push({ type: "connectToServer", server });
      return refusesConnections
        ? { ok: false, error: connectionNotKept }
        : { ok: true, data: null };
    },
    disconnectFromServer: () => {
      calls.push({ type: "disconnectFromServer" });
    },
    claimPairingCode: (serverUrl, code) => {
      calls.push({ type: "claimPairingCode", serverUrl, code });
      return pairingClaim.start();
    },
    scanPairingCode: () => {
      calls.push({ type: "scanPairingCode" });
      return pairingScan.start();
    },
    pickExecutable: () => {
      calls.push({ type: "pickExecutable" });
      return executablePick.start();
    },
    readDesktopServerSettings: () => {
      calls.push({ type: "readDesktopServerSettings" });
      return desktopServerCalls.readDesktopServerSettings.start();
    },
    saveDesktopServerSettings: (settings) => {
      calls.push({ type: "saveDesktopServerSettings", settings });
      return desktopServerCalls.saveDesktopServerSettings.start();
    },
    startDesktopServer: () => {
      calls.push({ type: "startDesktopServer" });
      return desktopServerCalls.startDesktopServer.start();
    },
    stopDesktopServer: () => {
      calls.push({ type: "stopDesktopServer" });
      return desktopServerCalls.stopDesktopServer.start();
    },
    readDesktopServerStatus: () => {
      calls.push({ type: "readDesktopServerStatus" });
      return desktopServerCalls.readDesktopServerStatus.start();
    },
    readDesktopServerLogs: () => {
      calls.push({ type: "readDesktopServerLogs" });
      return desktopServerCalls.readDesktopServerLogs.start();
    },
    subscribeToDesktopServerStatus: (listener) => {
      desktopServerListeners.add(listener);
      return () => desktopServerListeners.delete(listener);
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
    resolvePickSavePath: (pick) => {
      savePathPick.take().resolve(pick);
    },
    resolveSaveCopy: (outcome) => {
      copy.take().resolve(outcome);
    },
    rejectSaveCopy: (error) => {
      copy.take().reject(error);
    },
    requestSettings: () => {
      for (const listener of settingsListeners) listener();
    },
    changeSystemTheme: (theme) => {
      for (const listener of systemThemeListeners) listener(theme);
    },
    refuseCopies: () => {
      refusesCopies = true;
    },
    releasePreferenceLoads: () => preferenceLoads.resolve(),
    resolveServerAuthInfo: (outcome) => {
      serverAuthInfo.take().resolve(outcome);
    },
    resolveSession: (outcome) => {
      session.take().resolve(outcome);
    },
    refuseConnections: () => {
      refusesConnections = true;
    },
    resolvePairingClaim: (outcome) => {
      pairingClaim.take().resolve(outcome);
    },
    resolvePairingScan: (text) => {
      pairingScan.take().resolve(text);
    },
    resolvePickExecutable: (path) => {
      executablePick.take().resolve(path);
    },
    resolveDesktopServer: (control, answer) => {
      const pending = desktopServerCalls[control].take() as PendingPick<
        typeof answer
      >;
      pending.resolve(answer);
    },
    rejectDesktopServer: (control, message) => {
      desktopServerCalls[control].take().reject(new Error(message));
    },
    changeDesktopServerStatus: (status) => {
      for (const listener of desktopServerListeners) listener(status);
    },
  };
}

/** One pending call for each desktop server control. */
function createDesktopServerCalls() {
  return {
    readDesktopServerSettings: createPendingPick<DesktopServerSettings>(
      "desktop server settings read",
    ),
    saveDesktopServerSettings: createPendingPick<DesktopServerStatus>(
      "desktop server settings save",
    ),
    startDesktopServer: createPendingPick<DesktopServerStatus>(
      "desktop server start",
    ),
    stopDesktopServer: createPendingPick<DesktopServerStatus>(
      "desktop server stop",
    ),
    readDesktopServerStatus: createPendingPick<DesktopServerStatus>(
      "desktop server status read",
    ),
    readDesktopServerLogs: createPendingPick<readonly ServerLogEntry[]>(
      "desktop server log read",
    ),
  } satisfies {
    [C in DesktopServerControl]: ReturnType<
      typeof createPendingPick<DesktopServerAnswers[C]>
    >;
  };
}
