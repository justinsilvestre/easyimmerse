import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import type { MediaRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import { isAudioFileName, isDocumentFileName } from "../mediaFileExtensions.ts";
import { playbackRequestIds } from "./playbackRequests.ts";

const picturesRequestId = (mediaFileId: string) =>
  `media/${mediaFileId}/pictures`;

/**
 * Asks whether the open file shows pictures once its record arrives, when the browser holds it and its name is not that of a sound file or a book.
 * A file on the server's disk is answered by its tracks instead.
 */
export function picturesProbeOf(
  action: AppAction,
  route: MediaRoute,
): readonly Effect[] {
  const ids = playbackRequestIds(route.mediaFileId);
  if (!isSettled(action, ids.mediaFile, "listMediaFiles") || !action.outcome.ok)
    return [];
  const file = action.outcome.data.media_files.find(
    ({ id }) => id === route.mediaFileId,
  );
  if (
    file?.source.kind !== "browser_file" ||
    isAudioFileName(file.name) ||
    isDocumentFileName(file.name)
  )
    return [];
  const { name, source } = file;
  return [
    {
      type: "sendRequest",
      id: picturesRequestId(route.mediaFileId),
      request: { kind: "probePictures", file: { name, source } },
    },
  ];
}

/** Tells whether the action shows that the open file has pictures: its probe found them, or the server found a video track in it. */
export function picturesFoundBy(
  action: AppAction,
  route: MediaRoute,
  app: AppState,
): boolean {
  const { mediaFileId } = route;
  if (isSettled(action, picturesRequestId(mediaFileId), "probePictures"))
    return action.outcome.ok && action.outcome.data;
  if (
    !isSettled(action, playbackRequestIds(mediaFileId).tracks, "getMediaTracks")
  )
    return false;
  return (
    app.server.config !== null &&
    action.outcome.ok &&
    action.outcome.data.container.tracks.some(({ kind }) => kind === "video")
  );
}
