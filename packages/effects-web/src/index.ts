import type {
  BrowserFileRegistry,
  DefinitionWriter,
  Effects,
  PlayerRegistry,
  SavePathPick,
} from "@easyimmerse/state";
import { createBrowserFileRegistry, systemClock } from "@easyimmerse/state";
import { createAccountEffects } from "./accountEffects.ts";
import { createApplyAppearance } from "./applyAppearance.ts";
import { createCloseGuard } from "./closeGuard.ts";
import { copyTextToClipboard } from "./copyTextToClipboard.ts";
import { downloadFile } from "./downloadFile.ts";
import { openExternalUrl } from "./openExternalUrl.ts";
import { createPairingEffects } from "./pairingEffects.ts";
import { pickFile } from "./pickFile.ts";
import { createPickRegisteredFile } from "./pickRegisteredFile.ts";
import { createPlayerEffects } from "./playerEffects.ts";
import { createPreferenceStore } from "./preferenceStore.ts";
import { readLocalStorage } from "./readLocalStorage.ts";
import { readPlaybackProbes } from "./readPlaybackProbes.ts";
import { createSubscribeToSystemTheme } from "./subscribeToSystemTheme.ts";
import { unavailableDesktopServerEffects } from "./unavailableDesktopServerEffects.ts";

/** Builds the browser implementation of the app's side effects. */
export function createWebEffects(options: {
  playerRegistry: PlayerRegistry;
  /** Where picked media and dictionary files are kept; pass the app's own to read them back later. */
  browserFileRegistry?: BrowserFileRegistry<File>;
  /** Writes a dictionary definition as Markdown; the UI package provides the writer, which reads markup with the DOM's parser. */
  writeDefinitionMarkdown: DefinitionWriter;
}): Effects {
  const preferences = createPreferenceStore();
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
    saveOnDevice: preferences.save,
    loadFromDevice: preferences.load,
    openExternalUrl,
    copyText: copyTextToClipboard,
    guardClose: createCloseGuard(),
    subscribeToSettingsRequests: ignoreSettingsRequests,
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

export { createApplyAppearance } from "./applyAppearance.ts";
export type { PreferenceStore } from "./preferenceStore.ts";
export { readLocalStorage } from "./readLocalStorage.ts";
