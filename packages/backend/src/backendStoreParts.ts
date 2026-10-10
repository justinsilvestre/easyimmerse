import type { ServerConfig, ServerStoreParts } from "@easyimmerse/state";
import type { Middleware } from "redux";
import { withExtraArgument } from "redux-thunk";
import { backendApi } from "./backendApi.ts";
import type { BackendClient } from "./backendClient.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";

/**
 * Builds the reducer and middleware that the app store mounts for server data, sending every request through the given client.
 * `serverConfig` is the server the client talks to, or null when the app runs offline.
 */
export function createBackendStoreParts(
  client: BackendClient,
  serverConfig: ServerConfig | null,
): ServerStoreParts {
  return {
    reducerPath: backendApi.reducerPath,
    reducer: backendApi.reducer,
    middleware: createMiddleware({ client }),
    serverConfig,
  };
}

/**
 * Chains the thunk middleware in front of the RTK Query middleware. The app store is built
 * by hand without Redux Toolkit's defaults, and RTK Query's hooks dispatch thunks.
 * The thunk middleware's extra argument carries the client to the base query.
 */
function createMiddleware(extra: BackendThunkExtra): Middleware {
  const thunkWithClient = withExtraArgument(extra);
  return (api) => (next) =>
    thunkWithClient(api)(backendApi.middleware(api)(next));
}
