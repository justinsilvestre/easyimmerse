/**
 * One video or audio track a user may choose.
 * Stands in for the server's track type until it is generated from Rust.
 */
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

/** The language's name in English, such as `Japanese` for `ja` or `jpn`, or the tag itself when it is unknown. */
export function languageName(tag: string): string {
  try {
    const names = new Intl.DisplayNames(["en"], {
      type: "language",
      fallback: "none",
    });
    return names.of(tag) ?? tag;
  } catch {
    return tag;
  }
}
