import type { Feature, FeatureUpdate } from "../app/feature.ts";
import {
  mediaScreenLeftBy,
  openMediaScreen,
} from "../screen/openMediaScreen.ts";
import { crossesSaveInterval } from "./playbackPosition.ts";
import { isSameParagraph, type ReaderLocation } from "./readingLocation.ts";
import { saveOnLeaving, savePlayback } from "./savePlaces.ts";
import type { StoredPlacesState } from "./storedPlacesState.ts";
import { initialStoredPlaces } from "./storedPlacesState.ts";

/** Updates the stored places, loading them on request and saving them as reading and playback move on and when a media screen closes. */
export const updateStoredPlaces: FeatureUpdate<StoredPlacesState> = (
  places,
  action,
  app,
) => {
  switch (action.type) {
    case "readingLocationLoadRequested":
      return [
        places,
        places.reading[action.mediaFileId] === undefined
          ? [{ type: "loadReadingLocation", mediaFileId: action.mediaFileId }]
          : [],
      ];
    case "readingLocationLoaded":
      return [
        places.reading[action.mediaFileId] === undefined
          ? withReading(places, action.mediaFileId, action.location)
          : places,
        [],
      ];
    case "readingLocationReported":
      return [
        withReading(places, action.mediaFileId, action.location),
        isSameParagraph(action.location, places.reading[action.mediaFileId])
          ? []
          : [
              {
                type: "saveReadingLocation",
                mediaFileId: action.mediaFileId,
                location: action.location,
              },
            ],
      ];
    case "playbackPositionLoadRequested":
      return [
        places,
        places.playback[action.mediaFileId] === undefined
          ? [{ type: "loadPlaybackPosition", mediaFileId: action.mediaFileId }]
          : [],
      ];
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
      return left ? saveOnLeaving(places, left) : [places, []];
    }
  }
};

/** The stored places as a feature: where to resume each book and media file. */
export const storedPlacesFeature: Feature<StoredPlacesState> = {
  initialState: initialStoredPlaces,
  update: updateStoredPlaces,
};

function withReading(
  places: StoredPlacesState,
  mediaFileId: string,
  location: ReaderLocation | null,
): StoredPlacesState {
  return { ...places, reading: { ...places.reading, [mediaFileId]: location } };
}
