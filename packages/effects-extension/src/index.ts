import { createWebEffects } from "@easyimmerse/effects-web";
import type { Effects, PlayerRegistry } from "@easyimmerse/state";
import { browser } from "@wxt-dev/browser";
import { createOpenExternalUrl } from "./openExternalUrl.ts";

/**
 * Builds the browser-extension implementation of the app's side effects.
 *
 * Everything is inherited from the web effects, except that external URLs open in a new
 * tab through the extension's tabs API, since `window.open` is unreliable from a side panel.
 */
export function createExtensionEffects(options: {
  playerRegistry: PlayerRegistry;
}): Effects {
  return {
    ...createWebEffects(options),
    openExternalUrl: createOpenExternalUrl((properties) =>
      browser.tabs.create(properties),
    ),
  };
}
