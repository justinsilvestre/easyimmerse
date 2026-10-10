import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { updated } from "../../app/updated.ts";
import { withLoadedPreferences } from "../../preferences/preferencesState.ts";
import type { MediaRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { MediaScreenState } from "../screenState.ts";
import { isConversionNoticeDue, isNoticeSettled } from "./conversionNotice.ts";
import { pathPlaybackOf } from "./pathPlayback.ts";
import {
  measureRequest,
  playbackRequestIds,
  saveSelectionRequest,
  tracksRequest,
} from "./playbackRequests.ts";
import { sendFirstPlan, sendPlan, withPlayback } from "./sendPlan.ts";

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
) {
  const { playback } = screen;
  switch (action.type) {
    case "requestSettled":
      return requestSettled(screen, action, route, app);
    case "playbackEnvironmentMeasured":
      return playback !== null && action.mediaFileId === route.mediaFileId
        ? sendFirstPlan(
            withPlayback(screen, playback, { environment: action.environment }),
            route,
            app.screen.dialog,
            app.preferences,
          )
        : updated(screen);
    case "preferencesLoaded":
      return sendFirstPlan(
        screen,
        route,
        app.screen.dialog,
        withLoadedPreferences(app.preferences, action.preferences),
      );
    case "tracksChosen": {
      if (playback === null) return updated(screen);
      // The new plan decides afresh whether the notice is due.
      const chosen = withPlayback(screen, playback, {
        selection: action.selection,
        noticeDue: false,
      });
      const [planned, effects] = sendPlan(chosen, route, app.preferences);
      return updated(
        planned,
        ...effects,
        saveSelectionRequest(route, action.selection),
      );
    }
    case "trackChoiceCancelled":
      if (playback === null) return updated(screen);
      // A due notice opens as the choice closes.
      return playback.planRequest === null
        ? sendPlan(screen, route, app.preferences)
        : updated(withPlayback(screen, playback, { noticeDue: false }));
    case "conversionNoticeAccepted":
      return playback === null
        ? updated(screen)
        : updated(
            withPlayback(screen, playback, { isConversionAccepted: true }),
          );
    default:
      return updated(screen);
  }
}

/** Takes the open file's record and its tracks as they arrive, and a plan calling for the notice while the track choice is open. */
function requestSettled(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  app: AppState,
) {
  const ids = playbackRequestIds(route.mediaFileId);
  if (isSettled(action, ids.mediaFile, "listMediaFiles") && action.outcome.ok) {
    const file = action.outcome.data.media_files.find(
      (listed) => listed.id === route.mediaFileId,
    );
    return screen.playback === null && file?.source.kind === "path"
      ? updated(
          { ...screen, playback: pathPlaybackOf(file) },
          tracksRequest(route),
        )
      : updated(screen);
  }
  if (isSettled(action, ids.tracks, "getMediaTracks") && action.outcome.ok)
    return screen.playback === null
      ? updated(screen)
      : updated(screen, measureRequest(route, action.outcome.data));
  const { playback } = screen;
  if (
    isSettled(action, ids.plan, "planPlayback") &&
    action.outcome.ok &&
    playback !== null &&
    app.screen.dialog?.kind === "trackChoice"
  ) {
    const noticeDue = isConversionNoticeDue(
      action.outcome.data,
      isNoticeSettled(playback, app.preferences),
    );
    return updated(withPlayback(screen, playback, { noticeDue }));
  }
  return updated(screen);
}
