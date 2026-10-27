import { canManageLibrary } from "../account/canManageLibrary.ts";
import type { RootState } from "../app/createAppStore.ts";
import type { CachedQueries, CacheEntry } from "../server/cacheEntry.ts";
import { cacheEntry, type ServerCacheSlice } from "../server/cacheEntry.ts";
import type { MainRoute } from "./route.ts";
import { mainScreenOf } from "./route.ts";

/**
 * Tells whether the main screen, opened from a link, is one the app cannot reach:
 * a project, media file or library item the server says does not exist, the library management screens for someone who does not manage the library,
 * or a library screen while the app has no server.
 * It decides only once the answer it needs has arrived, and is false while that answer is on its way, while a move is on its way,
 * or for a screen the app navigated to itself.
 */
export function selectIsRouteUnreachable({ app, backend }: RootState): boolean {
  const { origin, awaitsLocation } = app.routeHistory;
  if (origin !== "link" || awaitsLocation) return false;
  const main = mainScreenOf(app.route);
  if (isLibraryScreen(main) && app.server.config === null) return true;
  return isMainScreenUnreachable(main, backend);
}

function isMainScreenUnreachable(
  route: MainRoute,
  backend: ServerCacheSlice,
): boolean {
  switch (route.screen) {
    case "project":
    case "projectSettings":
    case "review":
      return isMissing(cacheEntry(backend, "getProject", route.projectId));
    case "media":
      return (
        isMissing(cacheEntry(backend, "getProject", route.projectId)) ||
        isMediaFileUnlisted(backend, route.projectId, route.mediaFileId)
      );
    case "libraryItem":
      return isMissing(cacheEntry(backend, "getLibraryItem", route.itemId));
    case "libraryManage":
      return isKnownNotToManageLibrary(backend);
    case "libraryEdit":
      return (
        isKnownNotToManageLibrary(backend) ||
        isMissing(cacheEntry(backend, "getLibraryItem", route.itemId))
      );
    default:
      return false;
  }
}

function isLibraryScreen(route: MainRoute): boolean {
  return route.screen.startsWith("library");
}

/** Tells whether the server answered that what the query asks for does not exist. */
function isMissing(entry: CacheEntry<keyof CachedQueries>): boolean {
  return entry?.status === "rejected" && entry.error?.status === 404;
}

/** Tells whether the project's media files have arrived, and settled, without the file. */
function isMediaFileUnlisted(
  backend: ServerCacheSlice,
  projectId: string,
  mediaFileId: string,
): boolean {
  const entry = cacheEntry(backend, "listMediaFiles", projectId);
  return (
    entry?.status === "fulfilled" &&
    entry.data?.media_files.every(({ id }) => id !== mediaFileId) === true
  );
}

function isKnownNotToManageLibrary(backend: ServerCacheSlice): boolean {
  const entry = cacheEntry(backend, "getCurrentPrincipal", "self");
  return entry?.status === "fulfilled" && !canManageLibrary(entry.data);
}
