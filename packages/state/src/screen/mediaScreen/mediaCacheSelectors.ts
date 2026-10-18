import type { RootState } from "../../app/createAppStore.ts";
import { cacheEntry } from "../../server/cacheEntry.ts";
import { needsTrackChoice } from "./playbackMethodRules.ts";
import { selectPathPlayback } from "./playbackSelectors.ts";
import { selectOpenPlayedMediaFile } from "./playedMediaFile.ts";

/**
 * Returns the media file the open media screen plays, with its project, or null on any other screen.
 * It is the open file, or in the reader the audio file the book is aligned with, as `playedMediaFileOf` describes.
 */
function openFileOf(root: RootState) {
  const played = selectOpenPlayedMediaFile(root.app);
  return played
    ? { projectId: played.projectId, mediaFileId: played.mediaFileId }
    : null;
}

/** Tells whether the open media file has several tracks of a kind to choose among, once its tracks are in the cache. */
export function selectCanChooseTracks(root: RootState): boolean {
  const file = openFileOf(root);
  if (file === null) return false;
  const tracks = cacheEntry(root.backend, "getMediaTracks", file)?.data;
  return tracks !== undefined && needsTrackChoice(tracks.container, null);
}

/** Returns the cache entry of the open file's tracks once the media screen has asked for them, or undefined. */
export function selectOpenTracksEntry(root: RootState) {
  const file = openFileOf(root);
  const isAsked = selectPathPlayback(root) !== null;
  return file !== null && isAsked
    ? cacheEntry(root.backend, "getMediaTracks", file)
    : undefined;
}

/** Returns the cache entry of the playback method the media screen last asked for, or undefined. */
export function selectOpenMethodEntry(root: RootState) {
  const file = openFileOf(root);
  const request = selectPathPlayback(root)?.methodRequest ?? null;
  return file !== null && request !== null
    ? cacheEntry(root.backend, "choosePlaybackMethod", { ...file, request })
    : undefined;
}
