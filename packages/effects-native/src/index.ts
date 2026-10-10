import { createWebEffects } from "@easyimmerse/effects-web";
import type { Effects, PlayerRegistry, ServerConfig } from "@easyimmerse/state";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";
import { desktopDictionaryExtensions } from "./desktopDictionaryExtensions.ts";
import { openExternalUrl } from "./openExternalUrl.ts";
import { pickPath } from "./pickPath.ts";
import { createServerPreferenceStore } from "./serverPreferenceStore.ts";
import { subscribeToSettingsRequests } from "./subscribeToSettingsRequests.ts";
import { createWindowCloseGuard } from "./windowCloseGuard.ts";

/**
 * Builds the Tauri implementation of the app's side effects.
 * Native dialogs and external links go through Tauri plugins;
 * preferences are stored by the embedded server; the Settings menu item reaches the page as a Tauri event;
 * and closing the window while a flashcard has unsaved changes or is being saved asks first.
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
    openExternalUrl,
    guardClose: createWindowCloseGuard(
      getCurrentWindow(),
      confirmClosingWhileSaving,
    ),
    subscribeToSettingsRequests,
  };
}

/** Asks whether to close the window although a flashcard has unsaved changes or is still being saved. */
function confirmClosingWhileSaving(): Promise<boolean> {
  return ask(
    "A flashcard has unsaved changes or is still being saved. If you close easyImmerse now, they may be lost.",
    {
      title: "Close easyImmerse?",
      kind: "warning",
      okLabel: "Close",
      cancelLabel: "Keep open",
    },
  );
}
