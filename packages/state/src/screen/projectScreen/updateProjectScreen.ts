import type { AppAction } from "../../app/appAction.ts";
import { combineUpdates } from "../../app/combineUpdates.ts";
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
  const [next, effects] = updateParts(screen, action, route);
  return updated(next, ...effects, ...removalEffects(action, route));
}

const updateParts = combineUpdates<ProjectScreenState, [ProjectRoute]>({
  pendingMediaFile: updatePickedMediaFile,
  mediaImport: (wizard, action, route) =>
    updateMediaImport(wizard, action, route.projectId),
});

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
  pending: PickedMediaFile | null,
  action: AppAction,
  { projectId }: ProjectRoute,
) {
  const ids = mediaFilePickRequestIds(projectId);
  switch (action.type) {
    case "mediaFileChosen":
      return updated(action.file, {
        type: "sendRequest",
        id: ids.list,
        request: { kind: "listMediaFiles", projectId },
      });
    case "requestSettled":
      if (pending === null) return updated(pending);
      if (isSettled(action, ids.list, "listMediaFiles"))
        // A list that fails to load lets the file be sent anyway.
        return action.outcome.ok &&
          findMediaFileNamed(action.outcome.data, pending.name)
          ? updated(null, alreadyInProject(pending.name))
          : updated(pending, sendPickedFile(projectId, pending));
      if (isSettled(action, ids.add, "addMediaFile")) return updated(null);
      return updated(pending);
    default:
      return updated(pending);
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
