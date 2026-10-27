import { apiPathOf, type ServerConfig } from "@easyimmerse/state";
import { buildAuthorizationHeader } from "./conversionFileUrl.ts";

/** Fetches an API path from the server with the bearer token, for answers that are not JSON, such as media and packages. */
export type ServerFetch = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

/** Builds a fetch of the given server's paths over the given fetch. */
export function createServerFetch(
  server: ServerConfig,
  fetchFn: typeof fetch = (input, init) => globalThis.fetch(input, init),
): ServerFetch {
  return (path, init = {}) =>
    fetchFn(new URL(apiPathOf(path), server.serverUrl), {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        authorization: buildAuthorizationHeader(server),
      },
    });
}
