import type { ServerConfig } from "./resolveServerConfig.ts";

/**
 * Builds the URL a media element loads a media file from.
 * The token travels in the query string because media elements cannot send headers.
 */
export function buildMediaStreamUrl(
  server: ServerConfig,
  projectId: string,
  mediaFileId: string,
): string {
  const url = new URL(
    `/projects/${encodeURIComponent(projectId)}/media/${encodeURIComponent(mediaFileId)}/stream`,
    server.serverUrl,
  );
  url.searchParams.set("token", server.token);
  return url.toString();
}
