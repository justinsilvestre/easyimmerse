import type { Feature, FeatureUpdate } from "../app/feature.ts";
import {
  mediaScreenEnteredBy,
  mediaScreenLeftBy,
  openMediaScreen,
} from "../screen/openMediaScreen.ts";
import { crossesSaveInterval } from "./playbackPosition.ts";
import {
  isSameLocation,
  isSameParagraph,
  type ReaderLocation,
} from "./readingLocation.ts";
import { saveOnLeaving, savePlayback } from "./savePlaces.ts";
import type { StoredPlacesEffect } from "./storedPlacesEffect.ts";
import type { StoredPlacesState } from "./storedPlacesState.ts";
import { initialStoredPlaces } from "./storedPlacesState.ts";

/**
 * Updates the stored places: loads a media file's places when its screen opens,
 * and saves them as reading and playback move on and when its screen closes.
 */
export const updateStoredPlaces: FeatureUpdate<StoredPlacesState> = (
  places,
  action,
  app,
) => {
  switch (action.type) {
    case "readingLocationLoaded":
      return [
        places.reading[action.mediaFileId] === undefined
          ? withReading(places, action.mediaFileId, action.location)
          : places,
        [],
      ];
    case "readingLocationReported":
    case "readerJumped":
    case "readerMatchChosen":
      return readingMoved(places, action.mediaFileId, action.location);
    case "playbackPositionLoaded":
      return [
        {
          ...places,
          playback: { ...places.playback, [action.mediaFileId]: action.ms },
        },
        [],
      ];
    case "playerTimeChanged": {
      const open = openMediaScreen(app);
      return open &&
        crossesSaveInterval(open.player.currentTimeSeconds, action.seconds)
        ? savePlayback(places, open, action.seconds)
        : [places, []];
    }
    case "playerPlayingChanged": {
      const open = openMediaScreen(app);
      return open && !action.isPlaying
        ? savePlayback(places, open, open.player.currentTimeSeconds)
        : [places, []];
    }
    default: {
      const left = mediaScreenLeftBy(app, action);
      const [saved, saves] = left ? saveOnLeaving(places, left) : [places, []];
      const entered = mediaScreenEnteredBy(app, action);
      return [
        saved,
        entered === null ? saves : [...saves, ...placeLoads(places, entered)],
      ];
    }
  }
};

/** The stored places as a feature: where to resume each book and media file. */
export const storedPlacesFeature: Feature<StoredPlacesState> = {
  initialState: initialStoredPlaces,
  update: updateStoredPlaces,
};

/** Records the new reading place, and saves it when it lies in another paragraph. */
function readingMoved(
  places: StoredPlacesState,
  mediaFileId: string,
  location: ReaderLocation,
): readonly [StoredPlacesState, StoredPlacesEffect[]] {
  const stored = places.reading[mediaFileId];
  if (stored && isSameLocation(location, stored)) return [places, []];
  return [
    withReading(places, mediaFileId, location),
    isSameParagraph(location, stored)
      ? []
      : [{ type: "saveReadingLocation", mediaFileId, location }],
  ];
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
function placeLoads(
  places: StoredPlacesState,
  mediaFileId: string,
): StoredPlacesEffect[] {
  return [
    ...(places.reading[mediaFileId] === undefined
      ? [{ type: "loadReadingLocation", mediaFileId } as const]
      : []),
    ...(places.playback[mediaFileId] === undefined
      ? [{ type: "loadPlaybackPosition", mediaFileId } as const]
      : []),
  ];
}
