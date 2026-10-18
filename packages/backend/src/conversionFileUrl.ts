import type { ServerConfig } from "@easyimmerse/state";

/**
 * Builds the URL of a converted media file, such as the HLS playlist the playback route names.
 * These files take the bearer token in a header, which hls.js adds through `buildAuthorizationHeader`.
 */
export function buildConversionFileUrl(
  server: ServerConfig,
  playlistPath: string,
): string {
  return new URL(playlistPath, server.serverUrl).toString();
}

/** The value of the `Authorization` header every request to the server carries. */
export function buildAuthorizationHeader(server: ServerConfig): string {
  return `Bearer ${server.token}`;
}
