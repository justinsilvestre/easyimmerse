/** A stretch of the media the player holds ready, in seconds. */
export type BufferedRange = { startSeconds: number; endSeconds: number };

/** The player of the open media file as the controls show it. Its volume, mute and speed are among the preferences. */
export type PlayerState = {
  currentTimeSeconds: number;
  /** Zero until the player has loaded a file. */
  durationSeconds: number;
  /** What the player has loaded so far, which the seek bar shows, as a stream being converted arrives piece by piece. */
  buffered: readonly BufferedRange[];
  isPlaying: boolean;
};

export const initialPlayerState: PlayerState = {
  currentTimeSeconds: 0,
  durationSeconds: 0,
  buffered: [],
  isPlaying: false,
};
