import type { MediaFile } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import { updated } from "../../app/updated.ts";
import { withLoadedPreferences } from "../../preferences/preferencesState.ts";
import type { MediaRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import { isDocumentFileName } from "../mediaFileExtensions.ts";
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
import { selectPlayedMediaFile } from "./playedMediaFile.ts";
import {
  requestFirstPlaybackMethod,
  requestPlaybackMethod,
} from "./requestPlaybackMethod.ts";
import type { PlaybackApp } from "./updatePlaybackDialog.ts";

/**
 * Works out how a file on the server's disk plays: reads its record, asks for its tracks, measures the browser,
 * and asks for a playback method with the track choice and the lossless-audio preference. The first request waits while the user
 * makes the first track choice; each later choice is saved and asked about anew. A file the browser holds is probed for pictures instead.
 * The file is the one the player plays, which in the reader is the audio file the book is aligned with, as `playedMediaFileOf` describes.
 */
export function updatePathPlayback(
  playback: PathPlayback | null,
  action: AppAction,
  app: PlaybackApp,
) {
  const played = selectPlayedMediaFile(app);
  switch (action.type) {
    case "requestSettled":
      return requestSettled(playback, action, app);
    case "playbackEnvironmentMeasured":
      return playback !== null && action.mediaFileId === played.mediaFileId
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
        played,
        app.preferences,
      );
      return updated(
        requested,
        ...effects,
        saveSelectionRequest(played, action.selection),
      );
    }
    case "trackChoiceCancelled":
      if (playback === null) return updated(playback);
      // A due notice opens as the choice closes.
      return playback.methodRequest === null
        ? requestPlaybackMethod(playback, played, app.preferences)
        : updated({ ...playback, noticeDue: false });
    case "conversionNoticeAccepted":
      return updated(
        playback === null
          ? playback
          : { ...playback, isConversionAccepted: true },
      );
    case "readerAudioOpened":
      return readerAudioOpened(playback, action.audioFile, played);
    default:
      return updated(playback);
  }
}

/**
 * Starts working out how the audio file the reader opened plays, unless the player plays it already:
 * a file on the server's disk asks for its tracks, and a file the browser holds needs nothing more.
 */
function readerAudioOpened(
  playback: PathPlayback | null,
  audioFile: MediaFile,
  played: MediaRoute,
) {
  if (audioFile.id === played.mediaFileId) return updated(playback);
  const audio = { ...played, mediaFileId: audioFile.id };
  return audioFile.source.kind === "path"
    ? updated(pathPlaybackOf(audioFile), tracksRequest(audio))
    : updated(null);
}

/** Takes the open file's record and its tracks as they arrive, and a playback method calling for the notice while the track choice is open. */
function requestSettled(
  playback: PathPlayback | null,
  action: AppAction,
  app: PlaybackApp,
) {
  const route = selectShownMediaFile(app);
  const played = selectPlayedMediaFile(app);
  const ids = playbackRequestIds(played.mediaFileId);
  const routeFileId = playbackRequestIds(route.mediaFileId).mediaFile;
  if (isSettled(action, routeFileId, "listMediaFiles") && action.outcome.ok) {
    const file = action.outcome.data.media_files.find(
      (listed) => listed.id === route.mediaFileId,
    );
    // A book has nothing to play itself; the reader opens the audio file it is aligned with instead.
    if (file !== undefined && isDocumentFileName(file.name))
      return updated(playback);
    return playback === null && file?.source.kind === "path"
      ? updated(pathPlaybackOf(file), tracksRequest(route))
      : updated(playback, ...picturesProbeOf(action, app));
  }
  if (isSettled(action, ids.tracks, "getMediaTracks") && action.outcome.ok)
    return playback === null
      ? updated(playback)
      : updated(playback, measureRequest(played, action.outcome.data));
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
