import type {
  BrowserFileRegistry,
  Effects,
  PlayerRegistry,
} from "@easyimmerse/state";
import { createBrowserFileRegistry, systemClock } from "@easyimmerse/state";
import { createApplyAppearance } from "./applyAppearance.ts";
import { createCloseGuard } from "./closeGuard.ts";
import { copyTextToClipboard } from "./copyTextToClipboard.ts";
import { openExternalUrl } from "./openExternalUrl.ts";
import { pickFile } from "./pickFile.ts";
import { createPickRegisteredFile } from "./pickRegisteredFile.ts";
import { createPlayerEffects } from "./playerEffects.ts";
import { createPreferenceStore } from "./preferenceStore.ts";
import { readPlaybackProbes } from "./readPlaybackProbes.ts";
import { createSubscribeToSystemTheme } from "./subscribeToSystemTheme.ts";

/** Builds the browser implementation of the app's side effects. */
export function createWebEffects(options: {
  playerRegistry: PlayerRegistry;
  /** Where picked media and dictionary files are kept; pass the app's own to read them back later. */
  browserFileRegistry?: BrowserFileRegistry<File>;
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
    readPlaybackProbes,
    savePreference: preferences.save,
    loadPreference: preferences.load,
    openExternalUrl,
    copyText: copyTextToClipboard,
    guardClose: createCloseGuard(),
    subscribeToSettingsRequests: ignoreSettingsRequests,
    applyAppearance: createApplyAppearance(document.documentElement),
    subscribeToSystemTheme: createSubscribeToSystemTheme(
      window.matchMedia("(prefers-color-scheme: dark)"),
    ),
  };
}

/** A browser has no menu item for Settings, so nothing ever asks for it from outside the page. */
function ignoreSettingsRequests(): () => void {
  return () => undefined;
}

export { createApplyAppearance } from "./applyAppearance.ts";
export type { PreferenceStore } from "./preferenceStore.ts";
