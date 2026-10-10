import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import type { PickedMediaFile } from "../../platform/effects.ts";
import type { MainRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { ProjectScreenState } from "../screenState.ts";
import { findMediaFileNamed } from "./mediaFileOpenedBy.ts";
import { mediaFilePickRequestIds } from "./mediaFilePickRequestIds.ts";
import { mediaFileRemovalId } from "./mediaFileRemovalId.ts";
import { updateMediaImport } from "./updateMediaImport.ts";

type ProjectRoute = Extract<MainRoute, { screen: "project" }>;

/**
 * Updates the project overview: its media import dialog, the adding of a picked media file, and the removal of a media file.
 * The route then opens the added, existing or fetched file (see `mediaFileOpenedBy`), which replaces this screen.
 */
export function updateProjectScreen(
  screen: ProjectScreenState,
  action: AppAction,
  route: ProjectRoute,
) {
  const [withPick, pickEffects] = updatePickedMediaFile(screen, action, route);
  const [mediaImport, importEffects] = updateMediaImport(
    screen.mediaImport,
    action,
    route.projectId,
  );

  return updated(
    mediaImport === screen.mediaImport
      ? withPick
      : { ...withPick, mediaImport },
    ...pickEffects,
    ...importEffects,
    ...removalEffects(action, route),
  );
}

/** Removes a media file from the project when the user asks. */
function removalEffects(action: AppAction, { projectId }: ProjectRoute) {
  if (action.type !== "mediaFileRemovalRequested") return [];
  const { mediaFileId } = action;
  return [
    {
      type: "sendRequest",
      id: mediaFileRemovalId(projectId, mediaFileId),
      request: { kind: "removeMediaFile", projectId, mediaFileId },
    } satisfies Effect,
  ];
}

/** Adds a picked media file to the project, unless a file of that name is already there. */
function updatePickedMediaFile(
  screen: ProjectScreenState,
  action: AppAction,
  route: ProjectRoute,
) {
  const { projectId } = route;
  const ids = mediaFilePickRequestIds(projectId);
  const pending = screen.pendingMediaFile;
  switch (action.type) {
    case "mediaFileChosen":
      return updated(
        { ...screen, pendingMediaFile: action.file },
        {
          type: "sendRequest",
          id: ids.list,
          request: { kind: "listMediaFiles", projectId },
        },
      );
    case "requestSettled":
      if (pending === null) return updated(screen);
      if (isSettled(action, ids.list, "listMediaFiles"))
        // A list that fails to load lets the file be sent anyway.
        return action.outcome.ok &&
          findMediaFileNamed(action.outcome.data, pending.name)
          ? updated(
              { ...screen, pendingMediaFile: null },
              alreadyInProject(pending.name),
            )
          : updated(screen, sendPickedFile(projectId, pending));
      if (isSettled(action, ids.add, "addMediaFile"))
        return updated({ ...screen, pendingMediaFile: null });
      return updated(screen);
    default:
      return updated(screen);
  }
}

/** Sends a picked media file to the project. */
function sendPickedFile(projectId: string, file: PickedMediaFile) {
  return {
    type: "sendRequest",
    id: mediaFilePickRequestIds(projectId).add,
    request: { kind: "addMediaFile", projectId, request: file },
  } satisfies Effect;
}

function alreadyInProject(name: string) {
  return {
    type: "showNotice",
    content: transientNotice("info", `“${name}” is already in the project.`),
  } satisfies Effect;
}
