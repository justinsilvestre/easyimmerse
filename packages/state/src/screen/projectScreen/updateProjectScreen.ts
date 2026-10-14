import {
  ankiConnectEffects,
  updateAnkiConnectSetup,
} from "../../anki/updateAnkiConnect.ts";
import { updateAnkiExport } from "../../anki/updateAnkiExport.ts";
import { type AppAction, actions } from "../../app/appAction.ts";
import { combineUpdates } from "../../app/combineUpdates.ts";
import { dispatch } from "../../app/dispatchEffect.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import type { PickedMediaFile } from "../../platform/effects.ts";
import type { MainRoute } from "../../route/route.ts";
import type { ServerCacheSlice } from "../../server/cacheEntry.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { ProjectScreenState } from "../screenState.ts";
import { findMediaFileNamed } from "./mediaFileOpenedBy.ts";
import { mediaFilePickRequestIds } from "./mediaFilePickRequestIds.ts";
import { mediaFileRemovalId } from "./mediaFileRemovalId.ts";
import { updateMediaImport } from "./updateMediaImport.ts";

type ProjectRoute = Extract<MainRoute, { screen: "project" }>;

/**
 * Updates the project overview: its media import dialog, the adding of a picked media file, the removal of a media file,
 * and where the project's flashcards go: the Anki export dialog, the AnkiConnect setup dialog, and the sends to Anki.
 * The route opens an added, existing or fetched file (see `mediaFileOpenedBy`), which replaces this screen.
 * `backend` is the server cache, from which the Anki actions read the project's flashcards and media files.
 */
export function updateProjectScreen(
  screen: ProjectScreenState,
  action: AppAction,
  route: ProjectRoute,
  backend: ServerCacheSlice,
) {
  const [next, effects] = updateParts(screen, action, route, backend);
  return updated(
    next,
    ...effects,
    ...removalEffects(action, route),
    ...ankiConnectEffects(action, route.projectId, backend),
  );
}

const updateParts = combineUpdates<
  ProjectScreenState,
  [ProjectRoute, ServerCacheSlice]
>({
  pendingMediaFile: updatePickedMediaFile,
  mediaImport: (wizard, action, route) =>
    updateMediaImport(wizard, action, route.projectId),
  ankiExport: (dialog, action, { projectId }, backend) =>
    updateAnkiExport(dialog, action, { projectId, backend }),
  isAnkiConnectSetupOpen: (isOpen, action, { projectId }) =>
    updateAnkiConnectSetup(isOpen, action, projectId),
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
  return dispatch(
    actions.noticeRequested(
      transientNotice("info", `“${name}” is already in the project.`),
    ),
  );
}
