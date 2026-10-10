import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { selectMediaScreen } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import {
  mediaScreenEnteredBy,
  mediaScreenLeftBy,
} from "../screen/mediaScreenRouteChanges.ts";
import { crossesSaveInterval } from "./playbackPosition.ts";
import {
  isSameLocation,
  isSameParagraph,
  type ReaderLocation,
} from "./readingLocation.ts";
import { saveOnLeaving, savePlayback } from "./savePlaces.ts";
import type { StoredPlacesState } from "./storedPlacesState.ts";
import { initialStoredPlaces } from "./storedPlacesState.ts";

/**
 * Updates the stored places: loads a media file's places when its screen opens,
 * and saves them as reading and playback move on and when its screen closes.
 */
export const updateStoredPlaces: FeatureUpdate<
  StoredPlacesState,
  "route" | "screen"
> = (places, action, app) => {
  switch (action.type) {
    case "readingLocationLoaded":
      return updated(
        places.reading[action.mediaFileId] === undefined
          ? withReading(places, action.mediaFileId, action.location)
          : places,
      );
    case "readingLocationReported":
    case "readerJumped":
    case "readerMatchChosen":
      return readingMoved(places, action.mediaFileId, action.location);
    case "playbackPositionLoaded":
      return updated({
        ...places,
        playback: { ...places.playback, [action.mediaFileId]: action.ms },
      });
    case "playerTimeChanged": {
      const open = selectMediaScreen(app);
      return open &&
        crossesSaveInterval(
          open.screen.playing.player.currentTimeSeconds,
          action.seconds,
        )
        ? savePlayback(places, open, action.seconds)
        : updated(places);
    }
    case "playerPlayingChanged": {
      const open = selectMediaScreen(app);
      return open && !action.isPlaying
        ? savePlayback(
            places,
            open,
            open.screen.playing.player.currentTimeSeconds,
          )
        : updated(places);
    }
    default: {
      const left = mediaScreenLeftBy(app, action);
      const [saved, saves] =
        left === null ? updated(places) : saveOnLeaving(places, left);
      const entered = mediaScreenEnteredBy(app, action);
      if (entered === null) return updated(saved, ...saves);
      return updated(saved, ...saves, ...placeLoads(places, entered));
    }
  }
};

/** The stored places as a feature: where to resume each book and media file. */
export const storedPlacesFeature: Feature<
  StoredPlacesState,
  "route" | "screen"
> = {
  initialState: initialStoredPlaces,
  update: updateStoredPlaces,
};

/** Records the new reading place, and saves it when it lies in another paragraph. */
function readingMoved(
  places: StoredPlacesState,
  mediaFileId: string,
  location: ReaderLocation,
) {
  const stored = places.reading[mediaFileId];
  if (stored && isSameLocation(location, stored)) return updated(places);
  const moved = withReading(places, mediaFileId, location);
  return isSameParagraph(location, stored)
    ? updated(moved)
    : updated(moved, { type: "saveReadingLocation", mediaFileId, location });
}

function withReading(
  places: StoredPlacesState,
  mediaFileId: string,
  location: ReaderLocation | null,
): StoredPlacesState {
  return { ...places, reading: { ...places.reading, [mediaFileId]: location } };
}

/**
 * Loads the stored reading place and playback position of a media file, each unless it is already known.
 * Whether the file is a book is not known yet, so both are loaded; the one that does not apply loads as null.
 */
function placeLoads(places: StoredPlacesState, mediaFileId: string) {
  const loads = [
    places.reading[mediaFileId] === undefined &&
      ({ type: "loadReadingLocation", mediaFileId } satisfies Effect),
    places.playback[mediaFileId] === undefined &&
      ({ type: "loadPlaybackPosition", mediaFileId } satisfies Effect),
  ];
  return loads.filter((load) => load !== false);
}
