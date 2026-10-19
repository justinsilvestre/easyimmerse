import type { ListMediaFilesResponse, MediaFile } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import { jobKey } from "../../operations/jobs.ts";
import { mainScreenOf } from "../../route/route.ts";
import type { RouteApp } from "../../route/updateRoute.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { ProjectScreenState } from "../screenState.ts";
import { mediaFilePickRequestIds } from "./mediaFilePickRequestIds.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";

/**
 * Returns the media file that a settled request on the project overview opens:
 * the file a pick added, the one of the same name a pick found already in the project, or the file a media-source fetch added.
 */
export function mediaFileOpenedBy(
  app: RouteApp,
  action: AppAction,
): string | null {
  const main = app.screen.main;
  const route = mainScreenOf(app.route);
  if (main.kind !== "project" || route.screen !== "project") return null;
  const wizard = app.mediaImports[route.projectId] ?? null;
  return (
    openedByPick(main, action, route.projectId) ??
    (wizard && fileFetchedBy(wizard, action)?.id) ??
    null
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

/** Returns the media file that a settled status of the wizard's fetch says the fetch added, if it says so. */
export function fileFetchedBy(
  wizard: MediaImportWizard,
  action: AppAction,
): MediaFile | null {
  const { jobId } = wizard;
  if (jobId === null) return null;
  if (!isSettled(action, jobKey("mediaSource", jobId), "getMediaSourceJob"))
    return null;
  if (!action.outcome.ok || action.outcome.data.status !== "done") return null;
  return action.outcome.data.media_file;
}
