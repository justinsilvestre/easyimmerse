import type { RootState } from "@easyimmerse/state";
import {
  mainScreenOf,
  selectOpenMethodEntry,
  selectOpenTracksEntry,
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
    selectOpenTracksEntry,
    selectOpenMethodEntry,
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
