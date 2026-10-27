import type { BackendClient, BrowserFiles } from "@easyimmerse/backend";
import { createBackendStoreParts } from "@easyimmerse/backend";
import { createSubscribeToLinkClicks } from "@easyimmerse/effects-web";
import type { ServerState } from "@easyimmerse/state";
import {
  createAppStore,
  createPlayerRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import { definitionMarkdown } from "../components/dictionaryPopup/definitionMarkdown.ts";
import { createFakeBackendClient } from "./createFakeBackendClient.ts";
import { fixtureResponses } from "./fixtureResponses.ts";

/**
 * Builds a fresh store with recording effects and a player registry, whose backend requests go through the given client.
 * A server config makes hooks that build media URLs treat the client as a connected server, and a cloud URL names the official server the app offers to log in to.
 * Browser files let requests read the bytes and frames of the files their registry holds.
 * The store starts by loading the preferences that the given recording effects hold.
 * A plain click on one of the app's own links anywhere in the document moves the store, as in the browser, rather than loading the link.
 */
export function createTestAppStore(
  client: BackendClient = createFakeBackendClient(fixtureResponses),
  servers: ServerState = { config: null, cloudUrl: null },
  browserFiles: BrowserFiles | null = null,
  effects: ReturnType<typeof createRecordingEffects> = createRecordingEffects(
    {},
    false,
    definitionMarkdown,
  ),
) {
  const store = createAppStore(
    {
      ...effects,
      subscribeToLinkClicks: createSubscribeToLinkClicks(document, "plain"),
    },
    createBackendStoreParts(client, servers.config, browserFiles),
    servers.cloudUrl,
  );
  return { effects, store, playerRegistry: createPlayerRegistry() };
}
