import type {
  BrowserFileRegistry,
  Effects,
  PlayerRegistry,
} from "@easyimmerse/state";
import { createBrowserFileRegistry, systemClock } from "@easyimmerse/state";
import { createCloseGuard } from "./closeGuard.ts";
import { openExternalUrl } from "./openExternalUrl.ts";
import { pickFile } from "./pickFile.ts";
import { createPickRegisteredFile } from "./pickRegisteredFile.ts";
import { createPlayerEffects } from "./playerEffects.ts";
import { createPreferenceStore } from "./preferenceStore.ts";
import { readPlaybackProbes } from "./readPlaybackProbes.ts";
import { showNotification } from "./showNotification.ts";

/** Builds the browser implementation of the app's side effects. */
export function createWebEffects(options: {
  playerRegistry: PlayerRegistry;
  /** Where picked media and dictionary files are kept; pass the app's own to read them back later. */
  browserFileRegistry?: BrowserFileRegistry<File>;
  /** Replaces the default in-page toast. */
  notify?: (message: string) => void;
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
    showNotification: options.notify ?? showNotification,
    openExternalUrl,
    guardClose: createCloseGuard(),
    subscribeToSettingsRequests: ignoreSettingsRequests,
  };
}

/** A browser has no menu item for Settings, so nothing ever asks for it from outside the page. */
function ignoreSettingsRequests(): () => void {
  return () => undefined;
}

export type { PreferenceStore } from "./preferenceStore.ts";
