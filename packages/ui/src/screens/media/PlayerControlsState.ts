import type { BufferedRange } from "@easyimmerse/state";

/** The player's state as the controls show it. Volume is 0 to 1; speed is a multiplier. `buffered` is what the player has loaded so far. */
export type PlayerControlsState = {
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  buffered?: readonly BufferedRange[];
  volume: number;
  isMuted?: boolean;
  speed: number;
};
