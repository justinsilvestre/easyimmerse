import type { BackendClient } from "@easyimmerse/backend";
import { backendStoreParts, configureBackend } from "@easyimmerse/backend";
import type { ServerConfig } from "@easyimmerse/state";
import {
  createAppStore,
  createPlayerRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import { createFakeBackendClient } from "./createFakeBackendClient.ts";
import { fixtureResponses } from "./fixtureResponses.ts";

/**
 * Builds a fresh store with recording effects and a player registry, and points the backend at the given client.
 * A server config makes hooks that build media URLs treat the client as a connected server.
 */
export function createTestAppStore(
  client: BackendClient = createFakeBackendClient(fixtureResponses),
  server: ServerConfig | null = null,
) {
  const effects = createRecordingEffects();
  configureBackend(client, server);
  const store = createAppStore(effects, backendStoreParts);
  return { effects, store, playerRegistry: createPlayerRegistry() };
}
