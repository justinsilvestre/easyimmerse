import { createWebEffects } from "@easyimmerse/effects-web";
import type {
  BrowserFileRegistry,
  DefinitionWriter,
  Effects,
  PlayerRegistry,
  ServerConfig,
} from "@easyimmerse/state";
import { createMemoryHistory } from "@tanstack/history";
import { browser } from "@wxt-dev/browser";
import { createOpenExternalUrl } from "./openExternalUrl.ts";

/**
 * Builds the browser-extension implementation of the app's side effects.
 *
 * Everything is inherited from the web effects, except that external URLs open in a new
 * tab through the extension's tabs API, since `window.open` is unreliable from a side panel,
 * and that the side panel keeps its history in memory: it has no address bar, and a path written into its address would not load on reopening.
 * It starts at the home screen each time it opens.
 */
export function createExtensionEffects(options: {
  playerRegistry: PlayerRegistry;
  browserFileRegistry?: BrowserFileRegistry<File>;
  writeDefinitionMarkdown: DefinitionWriter;
  server?: ServerConfig | null;
}): Effects {
  return {
    ...createWebEffects({ ...options, history: createMemoryHistory() }),
    openExternalUrl: createOpenExternalUrl((properties) =>
      browser.tabs.create(properties),
    ),
  };
}
export { openMailedLink } from "@easyimmerse/effects-web";
