import type { SubtitleSelection } from "@easyimmerse/types";
import { type AppAction, actions } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { dispatch } from "../../app/dispatchEffect.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import type { PickedFile } from "../../platform/effects.ts";
import type { MediaRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import { selectShownMediaFile } from "./mediaScreenSelectors.ts";
import { roleForNewTrack } from "./roleForNewTrack.ts";
import { subtitleSelectionId } from "./subtitleSelectionId.ts";

const subtitlesNotAdded = () =>
  dispatch(
    actions.noticeRequested(
      transientNotice("danger", "The subtitles file could not be added"),
    ),
  );

/**
 * Adds a picked subtitles file to the open media file, once the tracks' listing tells which role is free for it,
 * and saves the subtitle tracks shown with a chosen track in its role.
 */
export function updateSubtitles(
  pending: PickedFile | null,
  action: AppAction,
  app: Pick<AppState, "route" | "screen">,
) {
  const route = selectShownMediaFile(app);
  switch (action.type) {
    case "subtitleTrackChosen":
      return updated(pending, saveSelection(action, route));
    case "subtitleFileChosen":
      // The new track's role depends on the current selection, which the listing returns.
      return updated(action.file, {
        type: "sendRequest",
        id: tracksRequestId(route),
        request: {
          kind: "listSubtitleTracks",
          projectId: route.projectId,
          mediaFileId: route.mediaFileId,
        },
      });
    case "requestSettled":
      if (
        pending === null ||
        !isSettled(action, tracksRequestId(route), "listSubtitleTracks")
      )
        return updated(pending);
      return updated(
        null,
        action.outcome.ok
          ? sendSubtitleFile(route, pending, action.outcome.data.selection)
          : subtitlesNotAdded(),
      );
    default:
      return updated(pending);
  }
}

function tracksRequestId({ mediaFileId }: MediaRoute): string {
  return `media/${mediaFileId}/listSubtitleTracks`;
}

/** Sends a picked subtitles file to the open media file, in the role the current selection leaves for it. */
function sendSubtitleFile(
  { projectId, mediaFileId }: MediaRoute,
  file: PickedFile,
  selection: SubtitleSelection,
) {
  return {
    type: "sendRequest",
    id: `media/${mediaFileId}/addSubtitleTrack`,
    request: {
      kind: "addSubtitleTrack",
      projectId,
      mediaFileId,
      request: {
        name: file.name,
        source: file.source,
        format: null,
        role: roleForNewTrack(selection),
      },
    },
  } satisfies Effect;
}

/** Saves the subtitle tracks shown with a chosen track in its role. */
function saveSelection(
  action: Extract<AppAction, { type: "subtitleTrackChosen" }>,
  route: MediaRoute,
) {
  const selection: SubtitleSelection = {
    ...action.shown,
    [`${action.role}_track_id`]: action.trackId,
  };
  const { projectId, mediaFileId } = route;
  return {
    type: "sendRequest",
    id: subtitleSelectionId(route, selection),
    request: {
      kind: "setSubtitleSelection",
      projectId,
      mediaFileId,
      selection,
    },
  } satisfies Effect;
}
