import type { MediaFile } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { dispatch } from "../../app/dispatchEffect.ts";
import type { Effect } from "../../app/effect.ts";
import type { Feature, ReadableState } from "../../app/feature.ts";
import { updated } from "../../app/updated.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import { mainScreenMoveOf } from "../../route/mainScreenMoveOf.ts";
import { mainScreenOf } from "../../route/route.ts";
import { cacheEntry } from "../../server/cacheEntry.ts";
import { fileFetchedBy } from "./mediaFileOpenedBy.ts";
import { endImport } from "./mediaImportRequests.ts";
import type { MediaImports, MediaImportWizard } from "./mediaImportWizard.ts";
import { updateMediaImport } from "./updateMediaImport.ts";

type MediaImportsApp = Pick<ReadableState, "route" | "screen" | "backend">;

const dialogActions: readonly AppAction["type"][] = [
  "mediaImportOpened",
  "mediaImportStepTaken",
  "mediaImportClosed",
];

/**
 * The projects' media import dialogs, as a feature. The dialog's own actions go to the project whose overview is shown.
 * A fetch under way or failed outlasts its project's overview, so that the user can leave and come back to it;
 * a dialog with no fetch is dropped once the overview goes, and its requests aborted.
 * A fetch that adds its file while its overview is not shown tells so in a notice, since the file does not open.
 */
export const mediaImportsFeature: Feature<
  MediaImports,
  "route" | "screen" | "backend"
> = {
  initialState: {},
  update: (imports, action, app) => {
    const shown = shownProjectOf(app);
    let next = imports;
    const effects: Effect[] = [];
    for (const projectId of projectIdsFor(imports, action, shown)) {
      const wizard = imports[projectId] ?? null;
      const [after, wizardEffects] = updateMediaImport(
        wizard,
        action,
        projectId,
      );
      next = withWizard(next, projectId, after);
      effects.push(...wizardEffects);
      const fetched = wizard && fileFetchedBy(projectId, action);
      if (fetched && projectId !== shown)
        effects.push(addedNotice(fetched, projectId, app));
    }
    const left = leftProjectOf(app, action);
    const leftWizard = left === null ? null : (next[left] ?? null);
    if (left === null || leftWizard === null || leftWizard.jobId !== null)
      return updated(next, ...effects);
    return updated(
      withWizard(next, left, null),
      ...effects,
      ...endImport(left, leftWizard),
    );
  },
};

function projectIdsFor(
  imports: MediaImports,
  action: AppAction,
  shown: string | null,
): readonly string[] {
  if (dialogActions.includes(action.type)) return shown === null ? [] : [shown];
  return Object.keys(imports);
}

function withWizard(
  imports: MediaImports,
  projectId: string,
  wizard: MediaImportWizard | null,
): MediaImports {
  if ((imports[projectId] ?? null) === wizard) return imports;
  if (wizard !== null) return { ...imports, [projectId]: wizard };
  const { [projectId]: _dropped, ...rest } = imports;
  return rest;
}

function shownProjectOf(app: MediaImportsApp): string | null {
  const main = mainScreenOf(app.route);
  return main.screen === "project" ? main.projectId : null;
}

function leftProjectOf(app: MediaImportsApp, action: AppAction) {
  const from = mainScreenMoveOf(app, action)?.from;
  return from?.screen === "project" ? from.projectId : null;
}

function addedNotice(file: MediaFile, projectId: string, app: MediaImportsApp) {
  const project = cacheEntry(app.backend, "getProject", projectId)?.data;
  const message = project
    ? `Added ${file.name} to ${project.settings.name}`
    : `Added ${file.name}`;
  return dispatch(actions.noticeRequested(transientNotice("success", message)));
}
