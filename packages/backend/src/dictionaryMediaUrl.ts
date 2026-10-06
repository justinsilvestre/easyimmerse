import type { ServerConfig } from "./resolveServerConfig.ts";

/**
 * Builds the URL an image element loads a file stored with a dictionary from.
 * The path within the dictionary is encoded as one segment, slashes included.
 * The token travels in the query string because image elements cannot send headers.
 */
export function buildDictionaryMediaUrl(
  server: ServerConfig,
  dictionaryId: string,
  path: string,
): string {
  const url = new URL(
    `/dictionaries/${encodeURIComponent(dictionaryId)}/media/${encodeURIComponent(path)}`,
    server.serverUrl,
  );
  url.searchParams.set("token", server.token);
  return url.toString();
}
