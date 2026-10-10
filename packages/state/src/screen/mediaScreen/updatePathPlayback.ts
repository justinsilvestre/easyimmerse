import type { AppAction } from "../../app/appAction.ts";
import { updated } from "../../app/updated.ts";
import { withLoadedPreferences } from "../../preferences/preferencesState.ts";
import { isSettled } from "../../server/isSettled.ts";
import { isConversionNoticeDue, isNoticeSettled } from "./conversionNotice.ts";
import { selectShownMediaFile } from "./mediaScreenSelectors.ts";
import type { PathPlayback } from "./pathPlayback.ts";
import { pathPlaybackOf } from "./pathPlayback.ts";
import { picturesProbeOf } from "./picturesProbe.ts";
import {
  measureRequest,
  playbackRequestIds,
  saveSelectionRequest,
  tracksRequest,
} from "./playbackRequests.ts";
import {
  requestFirstPlaybackMethod,
  requestPlaybackMethod,
} from "./requestPlaybackMethod.ts";
import type { PlaybackApp } from "./updatePlaybackDialog.ts";

/**
 * Works out how a file on the server's disk plays: reads its record, asks for its tracks, measures the browser,
 * and asks for a playback method with the track choice and the lossless-audio preference. The first request waits while the user
 * makes the first track choice; each later choice is saved and asked about anew. A file the browser holds is probed for pictures instead.
 */
export function updatePathPlayback(
  playback: PathPlayback | null,
  action: AppAction,
  app: PlaybackApp,
) {
  const route = selectShownMediaFile(app);
  switch (action.type) {
    case "requestSettled":
      return requestSettled(playback, action, app);
    case "playbackEnvironmentMeasured":
      return playback !== null && action.mediaFileId === route.mediaFileId
        ? requestFirstPlaybackMethod(
            { ...playback, environment: action.environment },
            app,
            app.preferences,
          )
        : updated(playback);
    case "preferencesLoaded":
      return requestFirstPlaybackMethod(
        playback,
        app,
        withLoadedPreferences(app.preferences, action.preferences),
      );
    case "tracksChosen": {
      if (playback === null) return updated(playback);
      // The new playback method decides afresh whether the notice is due.
      const chosen = {
        ...playback,
        selection: action.selection,
        noticeDue: false,
      };
      const [requested, effects] = requestPlaybackMethod(
        chosen,
        route,
        app.preferences,
      );
      return updated(
        requested,
        ...effects,
        saveSelectionRequest(route, action.selection),
      );
    }
    case "trackChoiceCancelled":
      if (playback === null) return updated(playback);
      // A due notice opens as the choice closes.
      return playback.methodRequest === null
        ? requestPlaybackMethod(playback, route, app.preferences)
        : updated({ ...playback, noticeDue: false });
    case "conversionNoticeAccepted":
      return updated(
        playback === null
          ? playback
          : { ...playback, isConversionAccepted: true },
      );
    default:
      return updated(playback);
  }
}

/** Takes the open file's record and its tracks as they arrive, and a playback method calling for the notice while the track choice is open. */
function requestSettled(
  playback: PathPlayback | null,
  action: AppAction,
  app: PlaybackApp,
) {
  const route = selectShownMediaFile(app);
  const ids = playbackRequestIds(route.mediaFileId);
  if (isSettled(action, ids.mediaFile, "listMediaFiles") && action.outcome.ok) {
    const file = action.outcome.data.media_files.find(
      (listed) => listed.id === route.mediaFileId,
    );
    return playback === null && file?.source.kind === "path"
      ? updated(pathPlaybackOf(file), tracksRequest(route))
      : updated(playback, ...picturesProbeOf(action, app));
  }
  if (isSettled(action, ids.tracks, "getMediaTracks") && action.outcome.ok)
    return playback === null
      ? updated(playback)
      : updated(playback, measureRequest(route, action.outcome.data));
  if (
    isSettled(action, ids.method, "choosePlaybackMethod") &&
    action.outcome.ok &&
    playback !== null &&
    app.screen.dialog?.kind === "trackChoice"
  ) {
    const noticeDue = isConversionNoticeDue(
      action.outcome.data,
      isNoticeSettled(playback, app.preferences),
    );
    return updated({ ...playback, noticeDue });
  }
  return updated(playback);
}
