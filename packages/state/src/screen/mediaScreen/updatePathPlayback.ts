import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import { withLoadedPreferences } from "../../preferences/preferencesState.ts";
import type { MediaRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { MediaScreenState } from "../screenState.ts";
import { pathPlaybackOf } from "./pathPlayback.ts";
import {
  measureRequest,
  playbackRequestIds,
  saveSelectionRequest,
  tracksRequest,
} from "./playbackRequests.ts";
import { sendFirstPlan, sendPlan, withPlayback } from "./sendPlan.ts";

type Updated = readonly [MediaScreenState, readonly Effect[]];

/**
 * Works out how a file on the server's disk plays: reads its record, asks for its tracks, measures the browser,
 * and asks for a plan with the track choice and the lossless-audio preference. The first plan waits while the user
 * makes the first track choice; each later choice is saved and planned anew. `app` is the state before the action.
 */
export function updatePathPlayback(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  app: AppState,
): Updated {
  const { playback } = screen;
  switch (action.type) {
    case "requestSettled":
      return requestSettled(screen, action, route);
    case "playbackEnvironmentMeasured":
      return playback !== null && action.mediaFileId === route.mediaFileId
        ? sendFirstPlan(
            withPlayback(screen, playback, { environment: action.environment }),
            route,
            app.screen.dialog,
            app.preferences,
          )
        : [screen, []];
    case "preferencesLoaded":
      return sendFirstPlan(
        screen,
        route,
        app.screen.dialog,
        withLoadedPreferences(app.preferences, action.preferences),
      );
    case "tracksChosen": {
      if (playback === null) return [screen, []];
      const chosen = withPlayback(screen, playback, {
        selection: action.selection,
      });
      const [planned, effects] = sendPlan(chosen, route, app.preferences);
      return [
        planned,
        [...effects, saveSelectionRequest(route, action.selection)],
      ];
    }
    case "trackChoiceCancelled":
      return playback?.planRequest === null
        ? sendPlan(screen, route, app.preferences)
        : [screen, []];
    case "conversionNoticeAccepted":
      return playback === null
        ? [screen, []]
        : [withPlayback(screen, playback, { isConversionAccepted: true }), []];
    default:
      return [screen, []];
  }
}

/** Takes the open file's record and its tracks as they arrive. */
function requestSettled(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
): Updated {
  const ids = playbackRequestIds(route.mediaFileId);
  if (isSettled(action, ids.mediaFile, "listMediaFiles") && action.outcome.ok) {
    const file = action.outcome.data.media_files.find(
      (listed) => listed.id === route.mediaFileId,
    );
    return screen.playback === null && file?.source.kind === "path"
      ? [{ ...screen, playback: pathPlaybackOf(file) }, [tracksRequest(route)]]
      : [screen, []];
  }
  if (isSettled(action, ids.tracks, "getMediaTracks") && action.outcome.ok)
    return screen.playback === null
      ? [screen, []]
      : [screen, [measureRequest(route, action.outcome.data)]];
  return [screen, []];
}
