/** The player's state as the controls show it. Volume is 0 to 1; speed is a multiplier. */
export type PlaybackState = {
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  volume: number;
  speed: number;
};

/** An audio or subtitle track the user can switch to. */
export type TrackOption = {
  id: string;
  label: string;
  language: string | null;
  /** The first lines of a subtitles track, for telling tracks apart. Null for an audio track. */
  sample: string | null;
};

/** The tracks a media file offers and which of them are in use. */
export type TrackSelection = {
  audio: readonly TrackOption[];
  subtitles: readonly TrackOption[];
  audioId: string | null;
  targetSubtitlesId: string | null;
  translationSubtitlesId: string | null;
};
