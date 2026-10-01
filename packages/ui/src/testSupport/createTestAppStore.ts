import type { BackendClient } from "@easyimmerse/backend";
import { backendStoreParts, configureBackend } from "@easyimmerse/backend";
import {
  createAppStore,
  createPlayerRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import { createFakeBackendClient } from "./createFakeBackendClient.ts";
import { fixtureResponses } from "./fixtureResponses.ts";

/** Builds a fresh store with recording effects and a player registry, and points the backend at the given client. */
export function createTestAppStore(
  client: BackendClient = createFakeBackendClient(fixtureResponses),
) {
  const effects = createRecordingEffects();
  configureBackend(client);
  const store = createAppStore(effects, backendStoreParts);
  return { effects, store, playerRegistry: createPlayerRegistry() };
}
