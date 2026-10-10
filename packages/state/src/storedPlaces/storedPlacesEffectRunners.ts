import { actions } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";
import { ignoreFailure } from "../platform/ignoreFailure.ts";
import {
  parsePlaybackPosition,
  playbackPositionKey,
} from "./playbackPosition.ts";
import { parseReadingLocation, readingLocationKey } from "./readingLocation.ts";
import type { StoredPlacesEffect } from "./storedPlacesActions.ts";

/** Stored places that cannot be read count as absent. */
export const storedPlacesEffectRunners = {
  loadReadingLocation: ({ mediaFileId }, effects, dispatch) => {
    effects
      .loadPreference(readingLocationKey(mediaFileId))
      .catch(() => null)
      .then((value) =>
        dispatch(
          actions.readingLocationLoaded(
            mediaFileId,
            parseReadingLocation(value),
          ),
        ),
      );
  },
  saveReadingLocation: ({ mediaFileId, location }, effects) => {
    effects
      .savePreference(readingLocationKey(mediaFileId), JSON.stringify(location))
      .catch(ignoreFailure);
  },
  loadPlaybackPosition: ({ mediaFileId }, effects, dispatch) => {
    effects
      .loadPreference(playbackPositionKey(mediaFileId))
      .catch(() => null)
      .then((value) =>
        dispatch(
          actions.playbackPositionLoaded(
            mediaFileId,
            parsePlaybackPosition(value),
          ),
        ),
      );
  },
  savePlaybackPosition: ({ mediaFileId, ms }, effects) => {
    effects
      .savePreference(playbackPositionKey(mediaFileId), String(Math.round(ms)))
      .catch(ignoreFailure);
  },
} satisfies EffectRunners<StoredPlacesEffect>;
