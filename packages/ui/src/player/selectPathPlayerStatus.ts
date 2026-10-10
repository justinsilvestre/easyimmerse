import {
  selectMediaTracksEntry,
  selectPlaybackMethodEntry,
} from "@easyimmerse/backend";
import type { RootState } from "@easyimmerse/state";
import {
  mainScreenOf,
  selectPathPlayback,
  selectPreference,
  selectRoute,
  selectServerConfig,
} from "@easyimmerse/state";
import { createSelector } from "reselect";
import { derivePlayerStatus } from "./derivePlayerStatus.ts";
import { loadingPlayback } from "./PlayerStatus.ts";

/**
 * Returns what the player shows for the open file on the server's disk,
 * from the tracks and the playback method that the media screen's update asked for.
 */
export const selectPathPlayerStatus = createSelector(
  [
    selectServerConfig,
    selectRoute,
    tracksEntryOf,
    methodEntryOf,
    selectPathPlayback,
    selectPreference("conversionNoticeDismissed"),
  ],
  (server, route, tracks, methodEntry, playback, noticeDismissed) => {
    const file = openFileOf(route);
    if (file === null) return loadingPlayback;
    return derivePlayerStatus({
      server,
      ...file,
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

function openFileOf(route: RootState["app"]["route"]) {
  const main = mainScreenOf(route);
  if (main.screen !== "media") return null;
  return { projectId: main.projectId, mediaFileId: main.mediaFileId };
}

function tracksEntryOf(state: RootState) {
  const file = openFileOf(selectRoute(state));
  const isAsked = selectPathPlayback(state) !== null;
  return file !== null && isAsked
    ? selectMediaTracksEntry(state, file)
    : undefined;
}

function methodEntryOf(state: RootState) {
  const file = openFileOf(selectRoute(state));
  const request = selectPathPlayback(state)?.methodRequest ?? null;
  return file !== null && request !== null
    ? selectPlaybackMethodEntry(state, { ...file, request })
    : undefined;
}
