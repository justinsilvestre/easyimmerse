import { apiPathOf, type ServerConfig } from "@easyimmerse/state";
import type { LibraryItem } from "@easyimmerse/types";

/**
 * Builds the URL of a library item's cover picture, for image elements, or returns null when there is no server or no cover.
 * The token travels in the query string because image elements cannot send headers.
 * The URL changes whenever the item does, so that a browser does not show a cover it cached before the cover changed.
 */
export function buildLibraryCoverUrl(
  server: ServerConfig | null,
  item: Pick<LibraryItem, "id" | "has_cover" | "updated_at_ms">,
): string | null {
  if (server === null || !item.has_cover) return null;
  const url = new URL(libraryItemUrl(server, item.id, "cover"));
  url.searchParams.set("v", String(item.updated_at_ms));
  return url.toString();
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
    apiPathOf(`/library/items/${encodeURIComponent(itemId)}/${part}`),
    server.serverUrl,
  );
  url.searchParams.set("token", server.token);
  return url.toString();
}
