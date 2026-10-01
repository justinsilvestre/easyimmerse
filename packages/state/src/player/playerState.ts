import type { TimeRange } from "@easyimmerse/types";

/** What the app knows about the media player. Times are in milliseconds. */
export type PlayerState = {
  /** The URL the player loads. Null until an effect resolves it after the media opens. */
  mediaUrl: string | null;
  mediaUrlError: string | null;
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
  mediaUrl: null,
  mediaUrlError: null,
  currentTimeMs: 0,
  durationMs: null,
  playing: false,
  playbackRate: 1,
  volume: 1,
  loop: null,
};
