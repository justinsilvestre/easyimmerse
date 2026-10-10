import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import { isSettled } from "../../server/isSettled.ts";
import { isAudioFileName, isDocumentFileName } from "../mediaFileExtensions.ts";
import { playbackRequestIds } from "./playbackRequests.ts";
import { shownMediaFile } from "./shownMediaScreen.ts";

const picturesRequestId = (mediaFileId: string) =>
  `media/${mediaFileId}/pictures`;

/**
 * Asks whether the open file shows pictures once its record arrives, when the browser holds it and its name is not that of a sound file or a book.
 * A file on the server's disk is answered by its tracks instead.
 */
export function picturesProbeOf(
  action: AppAction,
  app: Pick<AppState, "route">,
) {
  const { mediaFileId } = shownMediaFile(app);
  const ids = playbackRequestIds(mediaFileId);
  if (!isSettled(action, ids.mediaFile, "listMediaFiles") || !action.outcome.ok)
    return [];
  const file = action.outcome.data.media_files.find(
    ({ id }) => id === mediaFileId,
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
      id: picturesRequestId(mediaFileId),
      request: { kind: "probePictures", file: { name, source } },
    },
  ] satisfies Effect[];
}

/** Tells whether the action shows that the open file has pictures: its probe found them, or the server found a video track in it. */
export function picturesFoundBy(
  action: AppAction,
  app: Pick<AppState, "route" | "server">,
): boolean {
  const { mediaFileId } = shownMediaFile(app);
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
