import type { OpenMediaScreen } from "../screen/openMediaScreen.ts";
import type { StoredPlacesEffect } from "./storedPlacesEffect.ts";
import type { StoredPlacesState } from "./storedPlacesState.ts";

type Result = readonly [StoredPlacesState, StoredPlacesEffect[]];

/**
 * Remembers where playback is in the open media file and saves it, once the player has loaded the file.
 * A book never loads the player, so its position is not saved.
 */
export function savePlayback(
  places: StoredPlacesState,
  open: OpenMediaScreen,
  seconds: number,
): Result {
  if (open.player.durationSeconds === 0) return [places, []];
  const { mediaFileId } = open;
  const ms = seconds * 1000;
  return [
    { ...places, playback: { ...places.playback, [mediaFileId]: ms } },
    [{ type: "savePlaybackPosition", mediaFileId, ms }],
  ];
}

/**
 * Saves the reading place in the book being left, if it is a book, and then the playback position.
 * Within a paragraph the reading place is saved only here, so that scrolling does not write on every frame.
 */
export function saveOnLeaving(
  places: StoredPlacesState,
  left: OpenMediaScreen,
): Result {
  const location = places.reading[left.mediaFileId];
  const [remembered, effects] = savePlayback(
    places,
    left,
    left.player.currentTimeSeconds,
  );
  return [
    remembered,
    location
      ? [
          {
            type: "saveReadingLocation",
            mediaFileId: left.mediaFileId,
            location,
          },
          ...effects,
        ]
      : effects,
  ];
}
