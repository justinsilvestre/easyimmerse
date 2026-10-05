/** The player's state as the controls show it. Volume is 0 to 1; speed is a multiplier. */
export type PlayerControlsState = {
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  volume: number;
  speed: number;
};
