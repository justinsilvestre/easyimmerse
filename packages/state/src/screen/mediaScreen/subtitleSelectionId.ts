import type { SubtitleSelection } from "@easyimmerse/types";
import type { MediaRoute } from "../../route/route.ts";

/**
 * The id of the request that saves the subtitle tracks shown, with `none` for an empty role.
 * It names both tracks, so that two different choices never abort each other.
 */
export function subtitleSelectionId(
  route: MediaRoute,
  selection: SubtitleSelection,
): string {
  const target = selection.target_track_id ?? "none";
  const translation = selection.translation_track_id ?? "none";
  return `media/${route.mediaFileId}/subtitleSelection/${target}/${translation}`;
}
