import type { ListMediaFilesResponse, MediaFile } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { jobKey } from "../../operations/jobs.ts";
import { mainScreenOf } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { ProjectScreenState } from "../screenState.ts";
import { mediaFilePickRequestIds } from "./mediaFilePickRequestIds.ts";

/**
 * Returns the media file that a settled request on the project overview opens:
 * the file a pick added, the one of the same name a pick found already in the project, or the file a media-source fetch added.
 */
export function mediaFileOpenedBy(
  app: AppState,
  action: AppAction,
): string | null {
  const main = app.screen.main;
  const route = mainScreenOf(app.route);
  if (main.kind !== "project" || route.screen !== "project") return null;
  return (
    openedByPick(main, action, route.projectId) ?? openedByFetch(main, action)
  );
}

/** Returns the project's media file with the given name, if there is one. */
export function findMediaFileNamed(
  list: ListMediaFilesResponse,
  name: string,
): MediaFile | undefined {
  return list.media_files.find((file) => file.name === name);
}

function openedByPick(
  main: ProjectScreenState,
  action: AppAction,
  projectId: string,
): string | null {
  const pending = main.pendingMediaFile;
  if (pending === null) return null;
  const ids = mediaFilePickRequestIds(projectId);
  if (isSettled(action, ids.add, "addMediaFile"))
    return action.outcome.ok ? action.outcome.data.id : null;
  if (isSettled(action, ids.list, "listMediaFiles") && action.outcome.ok)
    return findMediaFileNamed(action.outcome.data, pending.name)?.id ?? null;
  return null;
}

function openedByFetch(
  main: ProjectScreenState,
  action: AppAction,
): string | null {
  const jobId = main.mediaImport?.jobId ?? null;
  if (jobId === null) return null;
  if (!isSettled(action, jobKey("mediaSource", jobId), "getMediaSourceJob"))
    return null;
  if (!action.outcome.ok || action.outcome.data.status !== "done") return null;
  return action.outcome.data.media_file?.id ?? null;
}
