import { updated } from "../app/updated.ts";
import type { OpenMediaScreen } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import { playedMediaFileOf } from "../screen/mediaScreen/playedMediaFile.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import type { StoredPlacesState } from "./storedPlacesState.ts";

/**
 * Remembers where playback is in the file the player plays and saves it, once the player has loaded the file.
 * A book never loads the player itself, so its own position is not saved; the reader's player plays the audio file
 * the book is aligned with, whose position is saved as the media screen saves it, as `playedMediaFileOf` describes.
 */
export function savePlayback(
  places: StoredPlacesState,
  open: OpenMediaScreen,
  seconds: number,
  backend: ServerCacheSlice,
) {
  if (open.screen.playing.player.durationSeconds === 0) return updated(places);
  const { mediaFileId } = playedMediaFileOf(backend, open.route);
  const ms = seconds * 1000;
  return updated(
    { ...places, playback: { ...places.playback, [mediaFileId]: ms } },
    { type: "savePlaybackPosition", mediaFileId, ms },
  );
}

/**
 * Saves the reading place in the book being left, if it is a book, and then the playback position.
 * Within a paragraph the reading place is saved only here, so that scrolling does not write on every frame.
 */
export function saveOnLeaving(
  places: StoredPlacesState,
  left: OpenMediaScreen,
  backend: ServerCacheSlice,
) {
  const { mediaFileId } = left.route;
  const location = places.reading[mediaFileId];
  const [remembered, effects] = savePlayback(
    places,
    left,
    left.screen.playing.player.currentTimeSeconds,
    backend,
  );
  return location
    ? updated(
        remembered,
        { type: "saveReadingLocation", mediaFileId, location },
        ...effects,
      )
    : updated(remembered, ...effects);
}
