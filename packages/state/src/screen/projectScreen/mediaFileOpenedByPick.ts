import type { ListMediaFilesResponse, MediaFile } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { mainScreenOf } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import { mediaFilePickRequestIds } from "./mediaFilePickRequestIds.ts";

/** Returns the media file that a settled request of a pick opens: the file added, or the one of the same name already in the project. */
export function mediaFileOpenedByPick(
  app: AppState,
  action: AppAction,
): string | null {
  const main = app.screen.main;
  const route = mainScreenOf(app.route);
  if (main.kind !== "project" || route.screen !== "project") return null;
  const pending = main.pendingMediaFile;
  if (pending === null) return null;
  const ids = mediaFilePickRequestIds(route.projectId);
  if (isSettled(action, ids.add, "addMediaFile"))
    return action.outcome.ok ? action.outcome.data.id : null;
  if (isSettled(action, ids.list, "listMediaFiles") && action.outcome.ok)
    return findMediaFileNamed(action.outcome.data, pending.name)?.id ?? null;
  return null;
}

/** Returns the project's media file with the given name, if there is one. */
export function findMediaFileNamed(
  list: ListMediaFilesResponse,
  name: string,
): MediaFile | undefined {
  return list.media_files.find((file) => file.name === name);
}
