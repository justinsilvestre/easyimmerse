import type { ServerConfig } from "@easyimmerse/backend";
import { createWebEffects } from "@easyimmerse/effects-web";
import type { Effects, PlayerRegistry } from "@easyimmerse/state";
import { openExternalUrl } from "./openExternalUrl.ts";
import { sendOsNotification } from "./osNotification.ts";
import { pickDictionaryFile } from "./pickDictionaryFile.ts";
import { pickFile } from "./pickFile.ts";
import { pickMediaFile } from "./pickMediaFile.ts";
import { createServerPreferenceStore } from "./serverPreferenceStore.ts";
import { createShowNotification } from "./showNotification.ts";
import { subscribeToSettingsRequests } from "./subscribeToSettingsRequests.ts";

/**
 * Builds the Tauri implementation of the app's side effects.
 * Native dialogs, notifications, and external links go through Tauri plugins;
 * preferences are stored by the embedded server; the Settings menu item reaches the page as a Tauri event.
 */
export function createNativeEffects(options: {
  playerRegistry: PlayerRegistry;
  server: ServerConfig;
}): Effects {
  const webEffects = createWebEffects({
    playerRegistry: options.playerRegistry,
  });
  const preferences = createServerPreferenceStore(options.server);
  return {
    ...webEffects,
    pickFile,
    pickMediaFile,
    pickDictionaryFile,
    savePreference: preferences.save,
    loadPreference: preferences.load,
    showNotification: createShowNotification(
      sendOsNotification,
      webEffects.showNotification,
    ),
    openExternalUrl,
    subscribeToSettingsRequests,
  };
}
