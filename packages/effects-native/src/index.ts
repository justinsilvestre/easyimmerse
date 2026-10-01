import type { ServerConfig } from "@easyimmerse/backend";
import { createWebEffects } from "@easyimmerse/effects-web";
import type { Effects, PlayerRegistry } from "@easyimmerse/state";
import { copyToClipboard } from "./copyToClipboard.ts";
import { openExternalUrl } from "./openExternalUrl.ts";
import { sendOsNotification } from "./osNotification.ts";
import { pickFile } from "./pickFile.ts";
import { createServerPreferenceStore } from "./serverPreferenceStore.ts";
import { createShowNotification } from "./showNotification.ts";
import {
  createResolveMediaPlayback,
  readStoredFileBytes,
  readStoredFileText,
} from "./storedFileEffects.ts";

/**
 * Builds the Tauri implementation of the app's side effects.
 * Native dialogs, notifications, the clipboard, and external links go through Tauri plugins.
 * Preferences are stored by the embedded server, which also streams media files.
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
    resolveMediaPlayback: createResolveMediaPlayback(options.server),
    readStoredFileText,
    readStoredFileBytes,
    savePreference: preferences.save,
    loadPreference: preferences.load,
    showNotification: createShowNotification(
      sendOsNotification,
      webEffects.showNotification,
    ),
    copyToClipboard,
    openExternalUrl,
  };
}
