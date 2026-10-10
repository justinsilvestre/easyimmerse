import type { SubtitleSelection } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import type { MediaRoute } from "../../route/route.ts";
import type { MediaScreenState } from "../screenState.ts";
import { subtitleSelectionId } from "./subtitleSelectionId.ts";

/** Saves the subtitle tracks shown with a chosen track in its role. */
export function updateSubtitleSelection(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  _app: AppState,
) {
  if (action.type !== "subtitleTrackChosen") return updated(screen);
  const selection: SubtitleSelection = {
    ...action.shown,
    [`${action.role}_track_id`]: action.trackId,
  };
  const { projectId, mediaFileId } = route;
  return updated(screen, {
    type: "sendRequest",
    id: subtitleSelectionId(route, selection),
    request: {
      kind: "setSubtitleSelection",
      projectId,
      mediaFileId,
      selection,
    },
  } satisfies Effect);
}
