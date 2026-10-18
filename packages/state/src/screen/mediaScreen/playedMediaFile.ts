import type { ReadableState } from "../../app/feature.ts";
import type { MediaRoute } from "../../route/route.ts";
import type { ServerCacheSlice } from "../../server/cacheEntry.ts";
import { cachedAlignedAudio } from "../readerScreen/readerAudioSelectors.ts";
import {
  selectMediaScreen,
  selectShownMediaFile,
} from "./mediaScreenSelectors.ts";

/**
 * Returns the media file a media screen's player plays, with its project.
 * On the media screen it is the route's file. The reader's route names the book, which has nothing to play,
 * but a book aligned with an audio file plays that file's sentences as they are read; once the server cache holds
 * the book's alignments and the project's media files, the player plays the audio file instead. The player, the playback
 * method, and the stored playback position then all belong to the audio file, and the media screen's playback rules work on it unchanged.
 */
export function playedMediaFileOf(
  backend: ServerCacheSlice,
  route: MediaRoute,
): MediaRoute {
  return {
    ...route,
    mediaFileId:
      cachedAlignedAudio(backend, route)?.file.id ?? route.mediaFileId,
  };
}

/** Returns the media file the shown media screen's player plays, as `playedMediaFileOf` describes. It throws on any other screen. */
export function selectPlayedMediaFile(
  app: Pick<ReadableState, "route" | "backend">,
): MediaRoute {
  return playedMediaFileOf(app.backend, selectShownMediaFile(app));
}

/** Returns the media file the open media screen's player plays, as `playedMediaFileOf` describes, or null on any other screen. */
export function selectOpenPlayedMediaFile(
  app: Pick<ReadableState, "route" | "screen" | "backend">,
): MediaRoute | null {
  const open = selectMediaScreen(app);
  return open && playedMediaFileOf(app.backend, open.route);
}
