import {
  buildAuthorizationHeader,
  buildConversionFileUrl,
  buildMediaStreamUrl,
} from "@easyimmerse/backend";
import type { ServerConfig } from "@easyimmerse/state";
import {
  isConversionNoticeDue,
  selectedFrameRate,
  tracksOfKind,
} from "@easyimmerse/state";
import type {
  PlaybackResponse,
  TrackSelection,
  TracksResponse,
} from "@easyimmerse/types";
import type { PlayerStatus } from "./PlayerStatus.ts";
import { failedPlayback, loadingPlayback } from "./PlayerStatus.ts";
import type { RequestError } from "./playbackFailure.ts";
import {
  describeRequestError,
  describeUnsupportedReason,
} from "./playbackFailure.ts";

export type PlayerStatusInputs = {
  server: ServerConfig | null;
  projectId: string;
  mediaFileId: string;
  tracks: TracksResponse | undefined;
  tracksError: RequestError;
  playback: PlaybackResponse | undefined;
  playbackError: RequestError;
  selection: TrackSelection | null;
  /** True when the conversion notice is not due: the preference dismissed it, or the user accepted it for this file. */
  noticeSettled: boolean;
};

/** Turns the state of the tracks and playback requests into what the player shows. */
export function derivePlayerStatus(inputs: PlayerStatusInputs): PlayerStatus {
  if (inputs.server === null)
    return failedPlayback(
      "This file is on a server's disk, and no server is connected.",
    );
  if (inputs.tracksError)
    return failedPlayback(describeRequestError(inputs.tracksError));
  if (inputs.playbackError)
    return failedPlayback(describeRequestError(inputs.playbackError));
  if (inputs.tracks === undefined || inputs.playback === undefined)
    return loadingPlayback;
  return planState(inputs, inputs.server, inputs.tracks, inputs.playback);
}

function planState(
  inputs: PlayerStatusInputs,
  server: ServerConfig,
  tracks: TracksResponse,
  playback: PlaybackResponse,
): PlayerStatus {
  const { plan } = playback;
  if (plan.kind === "unsupported")
    return failedPlayback(describeUnsupportedReason(plan.reason));
  const media = {
    frameRate: selectedFrameRate(tracks.container, inputs.selection),
    hasVideo: tracksOfKind(tracks.container, "video").length > 0,
  };
  if (plan.kind === "direct")
    return {
      status: "ready",
      ...media,
      source: {
        kind: "direct",
        url: buildMediaStreamUrl(server, inputs.projectId, inputs.mediaFileId),
      },
    };
  if (playback.playlist_path === null)
    return failedPlayback(
      "The server planned a conversion but named no playlist.",
    );
  if (isConversionNoticeDue(playback, inputs.noticeSettled))
    return { status: "notice" };
  return {
    status: "ready",
    ...media,
    source: {
      kind: "hls",
      url: buildConversionFileUrl(server, playback.playlist_path),
      authorization: buildAuthorizationHeader(server),
    },
  };
}
