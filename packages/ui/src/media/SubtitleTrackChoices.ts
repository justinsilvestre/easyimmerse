/** A subtitle track the user can switch to. */
export type SubtitleTrackOption = {
  id: string;
  label: string;
  language: string | null;
  /** The first lines of the track, for telling tracks apart. Null when the track has no cues. */
  sample: string | null;
};

/** The subtitle tracks a media file offers and which of them are in use. */
export type SubtitleTrackChoices = {
  subtitles: readonly SubtitleTrackOption[];
  targetSubtitlesId: string | null;
  translationSubtitlesId: string | null;
};
