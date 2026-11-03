import type { MediaFile } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import { jobKey } from "../../operations/jobs.ts";
import { mainScreenOf } from "../../route/route.ts";
import type { RouteApp } from "../../route/updateRoute.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { ProjectScreenState } from "../screenState.ts";
import { mediaFileAddId } from "./mediaFileAddId.ts";

/**
 * Returns the media file that a settled request on the project overview opens:
 * the file a pick added or found already in the project, or the file a media-source fetch added.
 */
export function mediaFileOpenedBy(
  app: RouteApp,
  action: AppAction,
): string | null {
  const main = app.screen.main;
  const route = mainScreenOf(app.route);
  if (main.kind !== "project" || route.screen !== "project") return null;
  return (
    openedByPick(main, action, route.projectId) ??
    fileFetchedBy(route.projectId, action)?.id ??
    null
  );
}

function openedByPick(
  main: ProjectScreenState,
  action: AppAction,
  projectId: string,
): string | null {
  if (
    main.pendingMediaFile === null ||
    !isSettled(action, mediaFileAddId(projectId), "addMediaFile")
  )
    return null;
  return action.outcome.ok ? action.outcome.data.id : null;
}

/**
 * Returns the media file that a settled status of one of the project's fetches says the fetch added, if it says so.
 * Only watched fetches are polled, since a fetch no longer watched has its status request aborted.
 */
export function fileFetchedBy(
  projectId: string,
  action: AppAction,
): MediaFile | null {
  if (
    action.type !== "requestSettled" ||
    action.request.kind !== "getMediaSourceJob" ||
    action.request.projectId !== projectId ||
    !isSettled(
      action,
      jobKey("mediaSource", action.request.jobId),
      "getMediaSourceJob",
    )
  )
    return null;
  if (!action.outcome.ok || action.outcome.data.status !== "done") return null;
  return action.outcome.data.media_file;
}
