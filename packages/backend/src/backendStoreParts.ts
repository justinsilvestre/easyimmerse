import type {
  BrowserFileRegistry,
  ServerConfig,
  ServerStoreParts,
} from "@easyimmerse/state";
import type { Middleware } from "redux";
import { withExtraArgument } from "redux-thunk";
import { type AnkiConnect, createAnkiConnect } from "./ankiConnect.ts";
import { backendApi } from "./backendApi.ts";
import type { BackendClient } from "./backendClient.ts";
import type { FrameCapturer } from "./frameCapturer.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { runRequest } from "./requestRunner.ts";
import { createServerFetch } from "./serverFetch.ts";

/** How a browser reaches the files it picked: the registry that holds them, and the capturer that draws their frames. */
export type BrowserFiles = {
  registry: BrowserFileRegistry<File>;
  frameCapturer: FrameCapturer;
};

/**
 * Builds the reducer, middleware and request runner that the app store mounts for server data, sending every request through the given client.
 * `serverConfig` is the server the client talks to, or null when the app runs offline.
 * `browserFiles` reaches the files a browser picked, whose bytes and frames some requests read; platforms whose files have paths pass none.
 * `ankiConnect` reaches Anki, through the platform's fetch unless another client is given.
 */
export function createBackendStoreParts(
  client: BackendClient,
  serverConfig: ServerConfig | null,
  browserFiles: BrowserFiles | null = null,
  ankiConnect: AnkiConnect = createAnkiConnect(),
): ServerStoreParts {
  return {
    reducer: backendApi.reducer,
    middleware: createMiddleware({
      client,
      browserFileRegistry: browserFiles?.registry ?? null,
      frameCapturer: browserFiles?.frameCapturer ?? null,
      failedPassages: { retryTimes: {} },
      serverFetch: serverConfig && createServerFetch(serverConfig),
      ankiConnect,
    }),
    runRequest,
    serverConfig,
  };
}

/**
 * Chains the thunk middleware in front of the RTK Query middleware. The app store is built
 * by hand without Redux Toolkit's defaults, and RTK Query's hooks dispatch thunks.
 * The thunk middleware's extra argument carries the client, the browser file registry, the frame capturer, the store's failed prefetch passages,
 * the server's plain fetch and the AnkiConnect client to the base query, the query functions and the backend's thunks.
 */
function createMiddleware(extra: BackendThunkExtra): Middleware {
  const thunkWithClient = withExtraArgument(extra);
  return (api) => (next) =>
    thunkWithClient(api)(backendApi.middleware(api)(next));
}
