import type { SubtitleSelection } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import type { PickedFile } from "../../platform/effects.ts";
import type { MediaRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { MediaScreenState } from "../screenState.ts";
import { roleForNewTrack } from "./roleForNewTrack.ts";

const subtitlesNotAdded = {
  type: "showNotice",
  content: transientNotice("danger", "The subtitles file could not be added"),
} satisfies Effect;

/** Adds a picked subtitles file to the open media file, once the tracks' listing tells which role is free for it. */
export function updateSubtitlePick(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
) {
  switch (action.type) {
    case "subtitleFileChosen":
      // The new track's role depends on the current selection, which the listing returns.
      return updated({ ...screen, pendingSubtitleFile: action.file }, {
        type: "sendRequest",
        id: tracksRequestId(route),
        request: {
          kind: "listSubtitleTracks",
          projectId: route.projectId,
          mediaFileId: route.mediaFileId,
        },
      } satisfies Effect);
    case "requestSettled": {
      const pending = screen.pendingSubtitleFile;
      if (
        pending === null ||
        !isSettled(action, tracksRequestId(route), "listSubtitleTracks")
      )
        return updated(screen);
      return updated(
        { ...screen, pendingSubtitleFile: null },
        action.outcome.ok
          ? sendSubtitleFile(route, pending, action.outcome.data.selection)
          : subtitlesNotAdded,
      );
    }
    default:
      return updated(screen);
  }
}

function tracksRequestId(route: MediaRoute): string {
  return `media/${route.mediaFileId}/listSubtitleTracks`;
}

/** Sends a picked subtitles file to the open media file, in the role the current selection leaves for it. */
function sendSubtitleFile(
  route: MediaRoute,
  file: PickedFile,
  selection: SubtitleSelection,
) {
  return {
    type: "sendRequest",
    id: `media/${route.mediaFileId}/addSubtitleTrack`,
    request: {
      kind: "addSubtitleTrack",
      projectId: route.projectId,
      mediaFileId: route.mediaFileId,
      request: {
        name: file.name,
        source: file.source,
        format: null,
        role: roleForNewTrack(selection),
      },
    },
  } satisfies Effect;
}
