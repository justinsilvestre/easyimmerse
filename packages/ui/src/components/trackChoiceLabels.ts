import { languageName } from "../projects/languages.ts";

/** One video or audio track as the track choice dialog shows it, derived from the probed track. */
export type TrackChoice = {
  /** The stream's index counted over every stream in the file, as ffmpeg numbers them. */
  streamIndex: number;
  /** The language tag stored in the file, or null when it is unknown. */
  language: string | null;
  title: string | null;
  /** A line describing the codec and picture or sound format, such as `H.264 1920×1080`. */
  format: string;
  isDefault: boolean;
};

/**
 * Names each track by its language and title, with the track's position added when
 * two tracks would otherwise read the same. A track with neither is `Track N`.
 */
export function trackLabels(tracks: readonly TrackChoice[]): string[] {
  const bases = tracks.map((track, index) => baseLabel(track, index + 1));
  return bases.map((base, index) =>
    bases.filter((other) => other === base).length > 1
      ? `${base} (track ${index + 1})`
      : base,
  );
}

function baseLabel(track: TrackChoice, position: number): string {
  const language =
    track.language === null ? null : languageName(track.language);
  const parts = [language, track.title].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : `Track ${position}`;
}
