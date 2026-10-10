import type { SubtitleSelection } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import type { MediaRoute } from "../../route/route.ts";
import type { MediaScreenState } from "../screenState.ts";

/**
 * Saves the subtitle tracks shown with a chosen track in its role.
 * The request's id names both tracks, so that two different choices never abort each other.
 */
export function updateSubtitleSelection(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  _app: AppState,
): readonly [MediaScreenState, readonly Effect[]] {
  if (action.type !== "subtitleTrackChosen") return [screen, []];
  const selection: SubtitleSelection = {
    ...action.shown,
    [`${action.role}_track_id`]: action.trackId,
  };
  const { projectId, mediaFileId } = route;
  return [
    screen,
    [
      {
        type: "sendRequest",
        id: `media/${mediaFileId}/subtitleSelection/${selection.target_track_id ?? "none"}/${selection.translation_track_id ?? "none"}`,
        request: {
          kind: "setSubtitleSelection",
          projectId,
          mediaFileId,
          selection,
        },
      },
    ],
  ];
}
