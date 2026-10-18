import {
  type RootState,
  selectOpenMethodEntry,
  selectOpenPlayedMediaFile,
  selectOpenTracksEntry,
  selectPathPlayback,
  selectPreference,
  selectServerConfig,
} from "@easyimmerse/state";
import { createSelector } from "reselect";
import { derivePlayerStatus } from "./derivePlayerStatus.ts";
import { loadingPlayback } from "./PlayerStatus.ts";

const playedFileOf = (root: RootState) =>
  selectOpenPlayedMediaFile({ ...root.app, backend: root.backend });

/**
 * Returns what the player shows for the file on the server's disk that the open media screen plays,
 * from the tracks and the playback method that the media screen's update asked for.
 * In the reader, that file is the audio file the book is aligned with.
 */
export const selectPathPlayerStatus = createSelector(
  [
    selectServerConfig,
    (root: RootState) => playedFileOf(root)?.projectId,
    (root: RootState) => playedFileOf(root)?.mediaFileId,
    selectOpenTracksEntry,
    selectOpenMethodEntry,
    selectPathPlayback,
    selectPreference("conversionNoticeDismissed"),
  ],
  (
    server,
    projectId,
    mediaFileId,
    tracks,
    methodEntry,
    playback,
    noticeDismissed,
  ) => {
    if (projectId === undefined || mediaFileId === undefined)
      return loadingPlayback;
    return derivePlayerStatus({
      server,
      projectId,
      mediaFileId,
      tracks: tracks?.data,
      tracksError: tracks?.error,
      playback: methodEntry?.data,
      playbackError: methodEntry?.error,
      selection: playback?.selection ?? null,
      noticeSettled:
        noticeDismissed === "true" || playback?.isConversionAccepted === true,
    });
  },
);
