import { createWebEffects } from "@easyimmerse/effects-web";
import type {
  BrowserFileRegistry,
  DefinitionWriter,
  Effects,
  PlayerRegistry,
  ServerConfig,
} from "@easyimmerse/state";
import { browser } from "@wxt-dev/browser";
import { createOpenExternalUrl } from "./openExternalUrl.ts";

/**
 * Builds the browser-extension implementation of the app's side effects.
 *
 * Everything is inherited from the web effects, except that external URLs open in a new
 * tab through the extension's tabs API, since `window.open` is unreliable from a side panel,
 * and that the side panel keeps no address: it has no address bar, and a path written there would not load on reopening.
 */
export function createExtensionEffects(options: {
  playerRegistry: PlayerRegistry;
  browserFileRegistry?: BrowserFileRegistry<File>;
  writeDefinitionMarkdown: DefinitionWriter;
  server?: ServerConfig | null;
}): Effects {
  return {
    ...createWebEffects(options),
    openExternalUrl: createOpenExternalUrl((properties) =>
      browser.tabs.create(properties),
    ),
    writeLocation: () => undefined,
    subscribeToLocation: () => () => undefined,
  };
}
export { openMailedLink } from "@easyimmerse/effects-web";
