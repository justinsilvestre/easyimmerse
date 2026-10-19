import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate, ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { selectMediaScreen } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import {
  mediaScreenEnteredBy,
  mediaScreenLeftBy,
} from "../screen/mediaScreenRouteChanges.ts";
import { alignedAudioSettledBy } from "../screen/readerScreen/alignedAudioSettledBy.ts";
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
 * Updates the stored places: loads a media file's places when its screen opens, and the playback position
 * of the audio file the open book turns out to be aligned with, and saves them as reading and playback move on and when its screen closes.
 */
export const updateStoredPlaces: FeatureUpdate<
  StoredPlacesState,
  "route" | "screen" | "mediaImports" | "backend"
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
    case "requestSettled": {
      // A settled request can also open a media file, such as one a pick added.
      const [moved, effects] = screenMoved(places, action, app);
      const audio = alignedAudioSettledBy(action, app);
      return updated(
        moved,
        ...effects,
        ...(audio ? playbackLoads(moved, audio.id) : []),
      );
    }
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
        ? savePlayback(places, open, action.seconds, app.backend)
        : updated(places);
    }
    case "playerPlayingChanged": {
      const open = selectMediaScreen(app);
      return open && !action.isPlaying
        ? savePlayback(
            places,
            open,
            open.screen.playing.player.currentTimeSeconds,
            app.backend,
          )
        : updated(places);
    }
    default:
      return screenMoved(places, action, app);
  }
};

/** The stored places as a feature: where to resume each book and media file. */
export const storedPlacesFeature: Feature<
  StoredPlacesState,
  "route" | "screen" | "mediaImports" | "backend"
> = {
  initialState: initialStoredPlaces,
  update: updateStoredPlaces,
};

/** Saves the places of the media file the action's route change leaves, and loads those of the one it enters. */
function screenMoved(
  places: StoredPlacesState,
  action: AppAction,
  app: Pick<ReadableState, "route" | "screen" | "mediaImports" | "backend">,
) {
  const left = mediaScreenLeftBy(app, action);
  const [saved, saves] =
    left === null ? updated(places) : saveOnLeaving(places, left, app.backend);
  const entered = mediaScreenEnteredBy(app, action);
  if (entered === null) return updated(saved, ...saves);
  return updated(saved, ...saves, ...placeLoads(places, entered));
}

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
  const readingLoads =
    places.reading[mediaFileId] === undefined
      ? [{ type: "loadReadingLocation", mediaFileId } satisfies Effect]
      : [];
  return [...readingLoads, ...playbackLoads(places, mediaFileId)];
}

/** Loads the stored playback position of a media file unless it is already known, as for the audio file the reader plays. */
function playbackLoads(
  places: StoredPlacesState,
  mediaFileId: string,
): Effect[] {
  return places.playback[mediaFileId] === undefined
    ? [{ type: "loadPlaybackPosition", mediaFileId }]
    : [];
}
