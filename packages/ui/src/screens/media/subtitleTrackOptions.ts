import type { SubtitleFile, TrackInfo } from "@easyimmerse/types";
import { stripMarkup } from "../../components/ClickableText.tsx";
import type { TrackOption } from "../../media/playback.ts";
import { languageName } from "../../projects/languages.ts";

/** The id the server gives an embedded subtitle stream in a subtitle selection. */
export const embeddedTrackId = (streamIndex: number) =>
  `embedded:${streamIndex}`;

/** The id the server gives a subtitles file in a subtitle selection. */
export const fileTrackId = (subtitleFileId: string) => `file:${subtitleFileId}`;

/** The stream index named by an embedded track id, or null for any other id. */
export function streamIndexOf(trackId: string | null): number | null {
  const match = trackId?.match(/^embedded:(\d+)$/);
  return match ? Number(match[1]) : null;
}

/** Lists the subtitle tracks inside the media file, then the subtitles files added to it. */
export function buildSubtitleTrackOptions(
  embedded: readonly TrackInfo[],
  files: readonly SubtitleFile[],
): TrackOption[] {
  return [
    ...embedded.map((track, position) => ({
      id: embeddedTrackId(track.index),
      label: labelOfEmbeddedTrack(track, position),
      language: primaryLanguageOf(track.language),
      sample: null,
    })),
    ...files.map((file) => ({
      id: fileTrackId(file.id),
      label: file.name,
      language: primaryLanguageOf(file.language),
      sample: file.cues[0] ? stripMarkup(file.cues[0].text) : null,
    })),
  ];
}

function labelOfEmbeddedTrack(track: TrackInfo, position: number): string {
  const language = primaryLanguageOf(track.language);
  const name = track.title ?? (language ? languageName(language) : null);
  return `${name ?? `Track ${position + 1}`} (embedded)`;
}

/**
 * Reduces a language tag to its primary language in the shortest form, so that a container's
 * `ger` or `deu` matches a project's `de`. Returns null for an unknown or undetermined language.
 */
export function primaryLanguageOf(tag: string | null): string | null {
  if (tag === null) return null;
  try {
    const language = new Intl.Locale(Intl.getCanonicalLocales(tag)[0] ?? "")
      .language;
    return !language || language === "und" ? null : language;
  } catch {
    return null;
  }
}

/** The one track in the language, or null when there is none or more than one. */
export function loneTrackIn(
  options: readonly TrackOption[],
  language: string,
): TrackOption | null {
  const matching = options.filter((option) => option.language === language);
  return matching.length === 1 ? (matching[0] ?? null) : null;
}
