import { updated } from "../app/updated.ts";
import type { OpenMediaScreen } from "../screen/openMediaScreen.ts";
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
  if (open.player.durationSeconds === 0) return updated(places);
  const { mediaFileId } = open;
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
  const location = places.reading[left.mediaFileId];
  const [remembered, effects] = savePlayback(
    places,
    left,
    left.player.currentTimeSeconds,
  );
  return updated(
    remembered,
    ...(location
      ? [
          {
            type: "saveReadingLocation",
            mediaFileId: left.mediaFileId,
            location,
          } as const,
          ...effects,
        ]
      : effects),
  );
}
