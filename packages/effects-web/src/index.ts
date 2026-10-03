import type { Effects, PlayerRegistry } from "@easyimmerse/state";
import { copyToClipboard } from "./copyToClipboard.ts";
import { openExternalUrl } from "./openExternalUrl.ts";
import { pickFile } from "./pickFile.ts";
import { createPreferenceStore } from "./preferenceStore.ts";
import { createSeekPlayer } from "./seekPlayer.ts";
import { showNotification } from "./showNotification.ts";

/** Builds the browser implementation of the app's side effects. */
export function createWebEffects(options: {
  playerRegistry: PlayerRegistry;
  /** Replaces the default in-page toast. */
  notify?: (message: string) => void;
}): Effects {
  const preferences = createPreferenceStore();
  return {
    seekPlayer: createSeekPlayer(options.playerRegistry),
    pickFile,
    savePreference: preferences.save,
    loadPreference: preferences.load,
    showNotification: options.notify ?? showNotification,
    copyToClipboard,
    openExternalUrl,
    subscribeToSettingsRequests: ignoreSettingsRequests,
  };
}

/** A browser has no menu item for Settings, so nothing ever asks for it from outside the page. */
function ignoreSettingsRequests(): () => void {
  return () => undefined;
}

export type { PreferenceStore } from "./preferenceStore.ts";
export { createPreferenceStore } from "./preferenceStore.ts";
