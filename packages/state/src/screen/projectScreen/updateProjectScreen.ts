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
import type { ScreenApp } from "../screenApp.ts";
import type { ProjectScreenState } from "../screenState.ts";
import { mediaFileAddId } from "./mediaFileAddId.ts";
import { mediaFileRemovalId } from "./mediaFileRemovalId.ts";

type ProjectRoute = Extract<MainRoute, { screen: "project" }>;

/**
 * Updates the project overview: the adding of a picked media file, the removal of a media file,
 * and where the project's flashcards go: the Anki export dialog, the AnkiConnect setup dialog, and the sends to Anki.
 * The route opens an added, existing or fetched file (see `mediaFileOpenedBy`), which replaces this screen.
 * The Anki actions read the project's flashcards and media files from the server cache, and the sends under way from the operations.
 */
export function updateProjectScreen(
  screen: ProjectScreenState,
  action: AppAction,
  route: ProjectRoute,
  app: Pick<ScreenApp, "backend" | "operations">,
) {
  const [next, effects] = updateParts(screen, action, route, app.backend);
  return updated(
    next,
    ...effects,
    ...removalEffects(action, route),
    ...ankiConnectEffects(action, route.projectId, app),
  );
}

const updateParts = combineUpdates<
  ProjectScreenState,
  [ProjectRoute, ServerCacheSlice]
>({
  pendingMediaFile: updatePickedMediaFile,
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

/** Adds a picked media file to the project, and tells when the project already had the same file. */
function updatePickedMediaFile(
  pending: PickedMediaFile | null,
  action: AppAction,
  { projectId }: ProjectRoute,
) {
  if (action.type === "mediaFileChosen")
    return updated(action.file, sendPickedFile(projectId, action.file));
  if (
    pending === null ||
    !isSettled(action, mediaFileAddId(projectId), "addMediaFile")
  )
    return updated(pending);
  return action.outcome.ok && action.outcome.data.was_already_in_project
    ? updated(null, alreadyInProject(action.outcome.data.name))
    : updated(null);
}

/** Sends a picked media file to the project. */
function sendPickedFile(projectId: string, file: PickedMediaFile) {
  return {
    type: "sendRequest",
    id: mediaFileAddId(projectId),
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
