import type { ServerConfig } from "@easyimmerse/backend";

/** Builds the URL the embedded server streams a media file from. The token goes in the query string because a media element cannot send headers. */
export function buildMediaStreamUrl(
  server: ServerConfig,
  projectId: string,
  mediaId: string,
): string {
  const path = `/projects/${encodeURIComponent(projectId)}/media/${encodeURIComponent(mediaId)}/stream`;
  const url = new URL(path, server.serverUrl);
  url.searchParams.set("token", server.token);
  return url.toString();
}
