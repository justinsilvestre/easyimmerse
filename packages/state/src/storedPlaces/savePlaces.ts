import { updated } from "../app/updated.ts";
import type { OpenMediaScreen } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import type { StoredPlacesState } from "./storedPlacesState.ts";

/**
 * Remembers where playback is in the open media file and saves it, once the player has loaded the file.
 * A book never loads the player, so its position is not saved.
 */
export function savePlayback(
  places: StoredPlacesState,
  open: OpenMediaScreen,
  seconds: number,
) {
  if (open.screen.playing.player.durationSeconds === 0) return updated(places);
  const { mediaFileId } = open.route;
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
) {
  const { mediaFileId } = left.route;
  const location = places.reading[mediaFileId];
  const [remembered, effects] = savePlayback(
    places,
    left,
    left.screen.playing.player.currentTimeSeconds,
  );
  return location
    ? updated(
        remembered,
        { type: "saveReadingLocation", mediaFileId, location },
        ...effects,
      )
    : updated(remembered, ...effects);
}
