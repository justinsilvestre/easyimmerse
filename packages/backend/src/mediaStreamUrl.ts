import type { ServerConfig } from "@easyimmerse/state";

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

/**
 * Builds the URL of one frame of a media file's video at a time, for image elements.
 * The token travels in the query string because image elements cannot send headers.
 */
export function buildMediaFrameUrl(
  server: ServerConfig,
  projectId: string,
  mediaFileId: string,
  atMs: number,
): string {
  const url = new URL(
    `/projects/${encodeURIComponent(projectId)}/media/${encodeURIComponent(mediaFileId)}/frame`,
    server.serverUrl,
  );
  url.searchParams.set("at_ms", String(Math.round(atMs)));
  url.searchParams.set("token", server.token);
  return url.toString();
}
