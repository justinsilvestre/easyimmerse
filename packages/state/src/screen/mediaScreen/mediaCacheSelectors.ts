import type { RootState } from "../../app/createAppStore.ts";
import type { Route } from "../../route/route.ts";
import { mainScreenOf } from "../../route/route.ts";
import { selectRoute } from "../../route/routeSelectors.ts";
import { cacheEntry } from "../../server/cacheEntry.ts";
import { needsTrackChoice } from "./playbackMethodRules.ts";
import { selectPathPlayback } from "./playbackSelectors.ts";

/** Returns the media file open on the main screen, with its project, or null on any other screen. */
function openFileOf(route: Route) {
  const main = mainScreenOf(route);
  return main.screen === "media"
    ? { projectId: main.projectId, mediaFileId: main.mediaFileId }
    : null;
}

/** Tells whether the open media file has several tracks of a kind to choose among, once its tracks are in the cache. */
export function selectCanChooseTracks(root: RootState): boolean {
  const file = openFileOf(selectRoute(root));
  if (file === null) return false;
  const tracks = cacheEntry(root.backend, "getMediaTracks", file)?.data;
  return tracks !== undefined && needsTrackChoice(tracks.container, null);
}

/** Returns the cache entry of the open file's tracks once the media screen has asked for them, or undefined. */
export function selectOpenTracksEntry(root: RootState) {
  const file = openFileOf(selectRoute(root));
  const isAsked = selectPathPlayback(root) !== null;
  return file !== null && isAsked
    ? cacheEntry(root.backend, "getMediaTracks", file)
    : undefined;
}

/** Returns the cache entry of the playback method the media screen last asked for, or undefined. */
export function selectOpenMethodEntry(root: RootState) {
  const file = openFileOf(selectRoute(root));
  const request = selectPathPlayback(root)?.methodRequest ?? null;
  return file !== null && request !== null
    ? cacheEntry(root.backend, "choosePlaybackMethod", { ...file, request })
    : undefined;
}
