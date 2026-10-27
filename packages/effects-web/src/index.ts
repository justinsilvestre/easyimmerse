import type {
  BrowserFileRegistry,
  DefinitionWriter,
  Effects,
  PlayerRegistry,
  SavePathPick,
  ServerConfig,
} from "@easyimmerse/state";
import { createBrowserFileRegistry, systemClock } from "@easyimmerse/state";
import { createBrowserHistory, type RouterHistory } from "@tanstack/history";
import { createAccountEffects } from "./accountEffects.ts";
import { createApplyAppearance } from "./applyAppearance.ts";
import { createCloseGuard } from "./closeGuard.ts";
import { copyTextToClipboard } from "./copyTextToClipboard.ts";
import { downloadFile } from "./downloadFile.ts";
import { createHistoryLocation } from "./historyLocation.ts";
import { openExternalUrl } from "./openExternalUrl.ts";
import { createPairingEffects } from "./pairingEffects.ts";
import { pickFile } from "./pickFile.ts";
import { createPickRegisteredFile } from "./pickRegisteredFile.ts";
import { createPlayerEffects } from "./playerEffects.ts";
import { createPreferenceStore } from "./preferenceStore.ts";
import { readLocalStorage } from "./readLocalStorage.ts";
import { readPlaybackProbes } from "./readPlaybackProbes.ts";
import { createScopedPreferenceStore } from "./scopedPreferenceStore.ts";
import {
  createSubscribeToLinkClicks,
  type LinkClickScope,
} from "./subscribeToLinkClicks.ts";
import { createSubscribeToSystemTheme } from "./subscribeToSystemTheme.ts";
import { unavailableDesktopServerEffects } from "./unavailableDesktopServerEffects.ts";

/** Builds the browser implementation of the app's side effects. */
export function createWebEffects(options: {
  playerRegistry: PlayerRegistry;
  /** Where picked media and dictionary files are kept; pass the app's own to read them back later. */
  browserFileRegistry?: BrowserFileRegistry<File>;
  /** Writes a dictionary definition as Markdown; the UI package provides the writer, which reads markup with the DOM's parser. */
  writeDefinitionMarkdown: DefinitionWriter;
  /** The server the app is connected to, which keeps the preferences that follow the person; absent or null when there is none. */
  server?: ServerConfig | null;
  /** The history that decides where the app is; the browser's own when absent. */
  history?: RouterHistory;
  /** Which clicks on the app's own links the app takes in place of the browser; plain clicks only when absent. */
  linkClicks?: LinkClickScope;
}): Effects {
  const deviceStore = createPreferenceStore();
  const preferences = createScopedPreferenceStore(
    options.server ?? null,
    deviceStore,
  );
  const pickRegisteredFile = createPickRegisteredFile(
    options.browserFileRegistry ?? createBrowserFileRegistry<File>(),
  );
  return {
    ...createPlayerEffects(options.playerRegistry),
    clock: systemClock,
    pickFile,
    pickMediaFile: pickRegisteredFile,
    pickDictionaryFile: pickRegisteredFile,
    pickSavePath: answerUnsupported,
    saveCopy: refuseCopy,
    downloadFile,
    readPlaybackProbes,
    writeDefinitionMarkdown: options.writeDefinitionMarkdown,
    savePreference: preferences.save,
    loadPreference: preferences.load,
    saveOnDevice: deviceStore.save,
    loadFromDevice: deviceStore.load,
    openExternalUrl,
    copyText: copyTextToClipboard,
    guardClose: createCloseGuard(),
    subscribeToSettingsRequests: ignoreSettingsRequests,
    subscribeToOpenedLinks: ignoreOpenedLinks,
    ...createHistoryLocation(options.history ?? createBrowserHistory()),
    subscribeToLinkClicks: createSubscribeToLinkClicks(
      document,
      options.linkClicks ?? "plain",
    ),
    applyAppearance: createApplyAppearance(document.documentElement),
    subscribeToSystemTheme: createSubscribeToSystemTheme(
      window.matchMedia("(prefers-color-scheme: dark)"),
    ),
    ...createAccountEffects(
      (input, init) => globalThis.fetch(input, init),
      readLocalStorage(),
      () => location.reload(),
    ),
    ...createPairingEffects((input, init) => globalThis.fetch(input, init)),
    ...unavailableDesktopServerEffects,
  };
}

/** A browser has no save dialog that names a path, so files are downloaded instead. */
async function answerUnsupported(): Promise<SavePathPick> {
  return { kind: "unsupported" };
}

/** A browser never answers a staging path, so it is never asked to keep a copy of a staged file. */
async function refuseCopy(): Promise<never> {
  throw new Error("A browser keeps no copy of a staged file.");
}

/** A browser has no menu item for Settings, so nothing ever asks for it from outside the page. */
function ignoreSettingsRequests(): () => void {
  return () => undefined;
}

/** A page is never opened by an `easyimmerse://` link, which only the installed apps handle. */
function ignoreOpenedLinks(): () => void {
  return () => undefined;
}

export { requestJson } from "./accountEffects.ts";
export { createApplyAppearance } from "./applyAppearance.ts";
export { openMailedLink } from "./openMailedLink.ts";
export type { PreferenceStore } from "./preferenceStore.ts";
export { readLocalStorage } from "./readLocalStorage.ts";
export { createServerPreferenceStore } from "./serverPreferenceStore.ts";
export { createSubscribeToLinkClicks } from "./subscribeToLinkClicks.ts";
