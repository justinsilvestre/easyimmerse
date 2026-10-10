import {
  selectMediaTracksResult,
  selectPlaybackPlanResult,
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
 * from the tracks and the plan that the media screen's update asked for.
 */
export const selectPathPlayerStatus = createSelector(
  [
    selectServerConfig,
    selectRoute,
    (state: RootState) => tracksResultOf(state).data,
    (state: RootState) => tracksResultOf(state).error,
    (state: RootState) => planResultOf(state).data,
    (state: RootState) => planResultOf(state).error,
    selectPathPlayback,
    selectPreference("conversionNoticeDismissed"),
  ],
  (
    server,
    route,
    tracks,
    tracksError,
    plan,
    planError,
    playback,
    noticeDismissed,
  ) => {
    const file = openFileOf(route);
    if (file === null) return loadingPlayback;
    return derivePlayerStatus({
      server,
      ...file,
      tracks,
      tracksError,
      playback: plan,
      playbackError: planError,
      selection: playback?.selection ?? null,
      noticeSettled:
        noticeDismissed === "true" || playback?.isConversionAccepted === true,
    });
  },
);

const noResult = { data: undefined, error: undefined };

function openFileOf(route: RootState["app"]["route"]) {
  const main = mainScreenOf(route);
  if (main.screen !== "media") return null;
  return { projectId: main.projectId, mediaFileId: main.mediaFileId };
}

function tracksResultOf(state: RootState) {
  const file = openFileOf(selectRoute(state));
  const isAsked = selectPathPlayback(state) !== null;
  return file !== null && isAsked
    ? selectMediaTracksResult(state, file)
    : noResult;
}

function planResultOf(state: RootState) {
  const file = openFileOf(selectRoute(state));
  const request = selectPathPlayback(state)?.planRequest ?? null;
  return file !== null && request !== null
    ? selectPlaybackPlanResult(state, { ...file, request })
    : noResult;
}
