import type { MediaFile, SubtitleTrack } from "@easyimmerse/types";
import type { Effect } from "../effect.ts";

/** Builds an effect reading each of the media's subtitle tracks that only the browser can read. */
export function readStoredSubtitleTexts(media: MediaFile): Effect[] {
  return media.subtitle_tracks.flatMap(readStoredSubtitleText);
}

/** Builds an effect reading the track's file when only the browser can read it. */
export function readStoredSubtitleText(track: SubtitleTrack): Effect[] {
  const { source } = track;
  if (source.kind !== "file" || source.source.kind !== "browser_file")
    return [];
  return [
    { type: "readStoredFileText", trackId: track.id, key: source.source.key },
  ];
}
