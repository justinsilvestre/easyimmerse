import type { ServerConfig } from "@easyimmerse/backend";
import { createWebEffects } from "@easyimmerse/effects-web";
import type { Effects, PlayerRegistry } from "@easyimmerse/state";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";
import { desktopDictionaryExtensions } from "./desktopDictionaryExtensions.ts";
import { openExternalUrl } from "./openExternalUrl.ts";
import { sendOsNotification } from "./osNotification.ts";
import { pickPath } from "./pickPath.ts";
import { createServerPreferenceStore } from "./serverPreferenceStore.ts";
import { createShowNotification } from "./showNotification.ts";
import { subscribeToSettingsRequests } from "./subscribeToSettingsRequests.ts";
import { createWindowCloseGuard } from "./windowCloseGuard.ts";

/**
 * Builds the Tauri implementation of the app's side effects.
 * Native dialogs, notifications, and external links go through Tauri plugins;
 * preferences are stored by the embedded server; the Settings menu item reaches the page as a Tauri event;
 * and closing the window while a flashcard is being saved asks first.
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
    pickFile: (accept) => pickPath("Subtitles", accept),
    pickMediaFile: (accept) => pickPath("Media", accept),
    pickDictionaryFile: (accept) =>
      pickPath("Dictionaries", desktopDictionaryExtensions(accept)),
    savePreference: preferences.save,
    loadPreference: preferences.load,
    showNotification: createShowNotification(
      sendOsNotification,
      webEffects.showNotification,
    ),
    openExternalUrl,
    guardClose: createWindowCloseGuard(
      getCurrentWindow(),
      confirmClosingWhileSaving,
    ),
    subscribeToSettingsRequests,
  };
}

/** Asks whether to close the window although a flashcard is still being saved. */
function confirmClosingWhileSaving(): Promise<boolean> {
  return ask(
    "A flashcard is still being saved. If you close easyImmerse now, it may be lost.",
    {
      title: "Close easyImmerse?",
      kind: "warning",
      okLabel: "Close",
      cancelLabel: "Keep open",
    },
  );
}
