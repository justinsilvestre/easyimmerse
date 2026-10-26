import type { Cue } from "@easyimmerse/types";
import type { MediaRoute } from "../../route/route.ts";
import { cacheEntry, type ServerCacheSlice } from "../../server/cacheEntry.ts";
import { cachedLibraryItemIdOf, cachedLibraryText } from "../cachedLibrary.ts";
import { cuesOfLibraryText } from "../libraryText.ts";

const noCues: readonly Cue[] = [];

/**
 * Returns the cues of the tracks chosen for a media file, in the target language and in the translation language,
 * read from the server cache. Either list is empty while no track is chosen for it or the cache lacks the track's cues.
 * A library media file's cues are those of its library item's text, as `cuesOfLibraryText` makes them.
 */
export function cachedCues(backend: ServerCacheSlice, file: MediaRoute) {
  const { projectId, mediaFileId } = file;
  const itemId = cachedLibraryItemIdOf(backend, projectId, mediaFileId);
  if (itemId !== null) return cachedLibraryCues(backend, itemId);
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

function cachedLibraryCues(backend: ServerCacheSlice, itemId: string) {
  const text = cachedLibraryText(backend, itemId);
  return text === null
    ? { cues: noCues, translationCues: noCues }
    : cuesOfLibraryText(text);
}
