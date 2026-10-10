import type {
  MediaFile,
  PlaybackEnvironment,
  PlaybackRequest,
  TrackSelection,
} from "@easyimmerse/types";
import { parseTrackSelection } from "./playbackPlanRules.ts";

/** What the media screen knows about playing a file from the server's disk. The tracks and the plan stay in the cache. */
export type PathPlayback = {
  /** The tracks to play: the saved choice, then the user's latest; null leaves the choice to the server. */
  selection: TrackSelection | null;
  /** The browser's media support for this file, measured once its tracks are known. */
  environment: PlaybackEnvironment | null;
  /** The plan request last sent, null until the first; later plans keep its audio target. */
  planRequest: PlaybackRequest | null;
  /** Whether the user let the conversion go ahead, so that the notice does not return while the file stays open. */
  isConversionAccepted: boolean;
  /** Whether a plan called for the conversion notice while the track choice was open, so that the notice opens once it closes. */
  noticeDue: boolean;
};

/** Returns the playback of a file on the server's disk before anything about it is known but its saved track choice. */
export function pathPlaybackOf(file: MediaFile): PathPlayback {
  return {
    selection: parseTrackSelection(file.track_selection_json),
    environment: null,
    planRequest: null,
    isConversionAccepted: false,
    noticeDue: false,
  };
}
