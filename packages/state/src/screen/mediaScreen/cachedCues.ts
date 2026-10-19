import type { Cue } from "@easyimmerse/types";
import type { MediaRoute } from "../../route/route.ts";
import { cacheEntry, type ServerCacheSlice } from "../../server/cacheEntry.ts";

const noCues: readonly Cue[] = [];

/**
 * Returns the cues of the tracks chosen for a media file, in the target language and in the translation language,
 * read from the server cache. Either list is empty while no track is chosen for it or the cache lacks the track's cues.
 */
export function cachedCues(backend: ServerCacheSlice, file: MediaRoute) {
  const { projectId, mediaFileId } = file;
  const tracks = cacheEntry(backend, "listSubtitleTracks", {
    projectId,
    mediaFileId,
  });
  const selection = tracks?.data?.selection;
  const cuesOf = (trackId: string | null | undefined) =>
    trackId == null
      ? noCues
      : (cacheEntry(backend, "getSubtitleCues", {
          projectId,
          mediaFileId,
          trackId,
        })?.data?.cues ?? noCues);
  return {
    cues: cuesOf(selection?.target_track_id),
    translationCues: cuesOf(selection?.translation_track_id),
  };
}
