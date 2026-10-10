import type { BackendClient } from "@easyimmerse/backend";
import { createBackendStoreParts } from "@easyimmerse/backend";
import type { BrowserFileRegistry, ServerConfig } from "@easyimmerse/state";
import {
  createAppStore,
  createPlayerRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import { createFakeBackendClient } from "./createFakeBackendClient.ts";
import { fixtureResponses } from "./fixtureResponses.ts";

/**
 * Builds a fresh store with recording effects and a player registry, whose backend requests go through the given client.
 * A server config makes hooks that build media URLs treat the client as a connected server.
 * A browser file registry lets requests read the bytes of the files it holds.
 * The device's preference store holds `storedPreferences` from the start, so the store loads them when it starts.
 */
export function createTestAppStore(
  client: BackendClient = createFakeBackendClient(fixtureResponses),
  server: ServerConfig | null = null,
  browserFileRegistry: BrowserFileRegistry<File> | null = null,
  storedPreferences: Record<string, string> = {},
) {
  const effects = createRecordingEffects(storedPreferences);
  const store = createAppStore(
    effects,
    createBackendStoreParts(client, server, browserFileRegistry),
  );
  return { effects, store, playerRegistry: createPlayerRegistry() };
}
