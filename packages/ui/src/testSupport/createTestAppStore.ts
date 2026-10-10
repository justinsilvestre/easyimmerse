import type { BackendClient, BrowserFiles } from "@easyimmerse/backend";
import { createBackendStoreParts } from "@easyimmerse/backend";
import type { ServerConfig } from "@easyimmerse/state";
import {
  createAppStore,
  createPlayerRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import { definitionMarkdown } from "../lookup/definitionMarkdown.ts";
import { createFakeBackendClient } from "./createFakeBackendClient.ts";
import { fixtureResponses } from "./fixtureResponses.ts";

/**
 * Builds a fresh store with recording effects and a player registry, whose backend requests go through the given client.
 * A server config makes hooks that build media URLs treat the client as a connected server.
 * Browser files let requests read the bytes and frames of the files their registry holds.
 * The store starts by loading the preferences that the given recording effects hold.
 */
export function createTestAppStore(
  client: BackendClient = createFakeBackendClient(fixtureResponses),
  server: ServerConfig | null = null,
  browserFiles: BrowserFiles | null = null,
  effects: ReturnType<typeof createRecordingEffects> = createRecordingEffects(
    {},
    false,
    definitionMarkdown,
  ),
) {
  const store = createAppStore(
    effects,
    createBackendStoreParts(client, server, browserFiles),
  );
  return { effects, store, playerRegistry: createPlayerRegistry() };
}
