import type { TimeRange } from "@easyimmerse/types";
import type { MediaPlayback } from "./mediaPlayback.ts";

/** What the app knows about the media player. Times are in milliseconds. */
export type PlayerState = {
  /** What the player loads. Null until an effect resolves it after the media opens, and while it is held. */
  playback: MediaPlayback | null;
  /** A converted playback that waits until the user confirms the conversion notice. */
  heldPlayback: MediaPlayback | null;
  playbackError: string | null;
  currentTimeMs: number;
  durationMs: number | null;
  /** Whether the media element reports that it is playing. */
  playing: boolean;
  playbackRate: number;
  /** A volume from 0 to 1. */
  volume: number;
  /** The range the player repeats, when set. */
  loop: TimeRange | null;
};

export const initialPlayerState: PlayerState = {
  playback: null,
  heldPlayback: null,
  playbackError: null,
  currentTimeMs: 0,
  durationMs: null,
  playing: false,
  playbackRate: 1,
  volume: 1,
  loop: null,
};
