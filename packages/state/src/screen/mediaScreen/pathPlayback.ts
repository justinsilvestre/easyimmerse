import type {
  MediaFile,
  PlaybackEnvironment,
  PlaybackMethodRequest,
  TrackSelection,
} from "@easyimmerse/types";
import { parseTrackSelection } from "./playbackMethodRules.ts";

/** What the media screen knows about playing a file from the server's disk. The tracks and the playback method stay in the cache. */
export type PathPlayback = {
  /** The tracks to play: the saved choice, then the user's latest; null leaves the choice to the server. */
  selection: TrackSelection | null;
  /** The browser's media support for this file, measured once its tracks are known. */
  environment: PlaybackEnvironment | null;
  /** The playback method request last sent, null until the first; later requests keep its audio target. */
  methodRequest: PlaybackMethodRequest | null;
  /** Whether the user let the conversion go ahead, so that the notice does not return while the file stays open. */
  isConversionAccepted: boolean;
  /** Whether a playback method called for the conversion notice while the track choice was open, so that the notice opens once it closes. */
  noticeDue: boolean;
};

/** Returns the playback of a file on the server's disk before anything about it is known but its saved track choice. */
export function pathPlaybackOf(file: MediaFile): PathPlayback {
  return {
    selection: parseTrackSelection(file.track_selection_json),
    environment: null,
    methodRequest: null,
    isConversionAccepted: false,
    noticeDue: false,
  };
}
