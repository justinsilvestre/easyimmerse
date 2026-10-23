import type { ServerConfig } from "@easyimmerse/state";

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
    dictionaryMediaPath(dictionaryId, path),
    server.serverUrl,
  );
  url.searchParams.set("token", server.token);
  return url.toString();
}

/** The path of the media route for a file stored with a dictionary, for a request that sends the token in a header. */
export function dictionaryMediaPath(
  dictionaryId: string,
  path: string,
): string {
  return `/dictionaries/${encodeURIComponent(dictionaryId)}/media/${encodeURIComponent(path)}`;
}
