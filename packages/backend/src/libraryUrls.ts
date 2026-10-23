import type { ServerConfig } from "@easyimmerse/state";

/**
 * Builds the URL of a library item's cover image, for image elements.
 * The token travels in the query string because image elements cannot send headers.
 */
export function buildLibraryCoverUrl(
  server: ServerConfig,
  itemId: string,
): string {
  return libraryItemUrl(server, itemId, "cover");
}

/**
 * Builds the URL of a library item's uploaded file, which a library manager previews in a media element.
 * The token travels in the query string because media elements cannot send headers.
 */
export function buildLibraryFileUrl(
  server: ServerConfig,
  itemId: string,
): string {
  return libraryItemUrl(server, itemId, "file");
}

function libraryItemUrl(
  server: ServerConfig,
  itemId: string,
  part: "cover" | "file",
): string {
  const url = new URL(
    `/library/items/${encodeURIComponent(itemId)}/${part}`,
    server.serverUrl,
  );
  url.searchParams.set("token", server.token);
  return url.toString();
}
