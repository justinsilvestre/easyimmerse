import type { Effects, PlayerRegistry } from "@easyimmerse/state";
import {
  createReadStoredFileText,
  createResolveMediaUrl,
} from "./browserFileEffects.ts";
import { createBrowserFileStore } from "./browserFileStore.ts";
import { copyToClipboard } from "./copyToClipboard.ts";
import { openExternalUrl } from "./openExternalUrl.ts";
import { createPickFile } from "./pickFile.ts";
import { createPlayerEffects } from "./playerEffects.ts";
import { createPreferenceStore } from "./preferenceStore.ts";
import { showNotification } from "./showNotification.ts";

/** Builds the browser implementation of the app's side effects. */
export function createWebEffects(options: {
  playerRegistry: PlayerRegistry;
  /** Replaces the default in-page toast. */
  notify?: (message: string) => void;
}): Effects {
  const preferences = createPreferenceStore();
  const files = createBrowserFileStore();
  return {
    ...createPlayerEffects(options.playerRegistry),
    pickFile: createPickFile(files),
    resolveMediaUrl: createResolveMediaUrl(files),
    readStoredFileText: createReadStoredFileText(files),
    savePreference: preferences.save,
    loadPreference: preferences.load,
    showNotification: options.notify ?? showNotification,
    copyToClipboard,
    openExternalUrl,
  };
}

export type { PreferenceStore } from "./preferenceStore.ts";
export { createPreferenceStore } from "./preferenceStore.ts";
