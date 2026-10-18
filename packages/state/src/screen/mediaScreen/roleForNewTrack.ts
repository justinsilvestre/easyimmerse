import type { SubtitleRole, SubtitleSelection } from "@easyimmerse/types";

/**
 * The role a newly added subtitles file takes: the target language while none is shown,
 * else the translation while none is shown, else it replaces the target-language track.
 */
export function roleForNewTrack(selection: SubtitleSelection): SubtitleRole {
  if (selection.target_track_id === null) return "target";
  if (selection.translation_track_id === null) return "translation";
  return "target";
}
