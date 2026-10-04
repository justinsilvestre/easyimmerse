/** The player's state as the controls show it. Volume is 0 to 1; speed is a multiplier. */
export type PlaybackState = {
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  volume: number;
  speed: number;
};

/** A subtitle track the user can switch to. */
export type TrackOption = {
  id: string;
  label: string;
  language: string | null;
  /** The first lines of the track, for telling tracks apart. Null when the track has no cues. */
  sample: string | null;
};

/** The subtitle tracks a media file offers and which of them are in use. */
export type TrackSelection = {
  subtitles: readonly TrackOption[];
  targetSubtitlesId: string | null;
  translationSubtitlesId: string | null;
};
