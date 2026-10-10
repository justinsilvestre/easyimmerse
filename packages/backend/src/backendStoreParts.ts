import type {
  BrowserFileRegistry,
  ServerConfig,
  ServerStoreParts,
} from "@easyimmerse/state";
import type { Middleware } from "redux";
import { withExtraArgument } from "redux-thunk";
import { backendApi } from "./backendApi.ts";
import type { BackendClient } from "./backendClient.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { runRequest } from "./requestRunner.ts";

/**
 * Builds the reducer, middleware and request runner that the app store mounts for server data, sending every request through the given client.
 * `serverConfig` is the server the client talks to, or null when the app runs offline.
 * `browserFileRegistry` holds the files a browser picked, whose bytes some requests send; platforms whose files have paths pass none.
 */
export function createBackendStoreParts(
  client: BackendClient,
  serverConfig: ServerConfig | null,
  browserFileRegistry: BrowserFileRegistry<File> | null = null,
): ServerStoreParts {
  return {
    reducerPath: backendApi.reducerPath,
    reducer: backendApi.reducer,
    middleware: createMiddleware({
      client,
      browserFileRegistry,
      frameCapturer: null,
      failedPassages: { retryTimes: {} },
    }),
    runRequest,
    serverConfig,
  };
}

/**
 * Chains the thunk middleware in front of the RTK Query middleware. The app store is built
 * by hand without Redux Toolkit's defaults, and RTK Query's hooks dispatch thunks.
 * The thunk middleware's extra argument carries the client, the browser file registry and the store's failed prefetch passages to the base query, the query functions and the backend's thunks.
 */
function createMiddleware(extra: BackendThunkExtra): Middleware {
  const thunkWithClient = withExtraArgument(extra);
  return (api) => (next) =>
    thunkWithClient(api)(backendApi.middleware(api)(next));
}
