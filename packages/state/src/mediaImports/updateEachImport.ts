import type { MediaFile } from "@easyimmerse/types";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import type { Effect } from "../app/effect.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import { mainScreenOf } from "../route/route.ts";
import { fileFetchedBy } from "../screen/projectScreen/mediaFileOpenedBy.ts";
import { cacheEntry } from "../server/cacheEntry.ts";
import type { MediaImports } from "./mediaImportWizard.ts";
import { withWizard } from "./mediaImportWizard.ts";
import { updateMediaImport } from "./updateMediaImport.ts";

type EachImportApp = Pick<ReadableState, "route" | "backend">;

const dialogActions: readonly AppAction["type"][] = [
  "mediaImportOpened",
  "mediaImportStepTaken",
  "mediaImportClosed",
];

/**
 * Updates each project's dialog: the dialog's own actions go to the project whose overview is shown, and answers to every dialog.
 * A fetch that adds its file while its overview is not shown tells so in a notice, since the file does not open.
 */
export function updateEachImport(
  imports: MediaImports,
  action: AppAction,
  app: EachImportApp,
) {
  const shown = shownProjectOf(app);
  let next = imports;
  const effects: Effect[] = [];
  for (const projectId of projectIdsFor(imports, action, shown)) {
    const wizard = imports[projectId] ?? null;
    const [after, wizardEffects] = updateMediaImport(wizard, action, projectId);
    next = withWizard(next, projectId, after);
    effects.push(...wizardEffects);
    const fetched = wizard && fileFetchedBy(projectId, action);
    if (fetched && projectId !== shown)
      effects.push(addedNotice(fetched, projectId, app));
  }
  return updated(next, ...effects);
}

function projectIdsFor(
  imports: MediaImports,
  action: AppAction,
  shown: string | null,
): readonly string[] {
  if (dialogActions.includes(action.type)) return shown === null ? [] : [shown];
  return Object.keys(imports);
}

function shownProjectOf(app: EachImportApp): string | null {
  const main = mainScreenOf(app.route);
  return main.screen === "project" ? main.projectId : null;
}

function addedNotice(file: MediaFile, projectId: string, app: EachImportApp) {
  const project = cacheEntry(app.backend, "getProject", projectId)?.data;
  const message = project
    ? `Added ${file.name} to ${project.settings.name}`
    : `Added ${file.name}`;
  return dispatch(actions.noticeRequested(transientNotice("success", message)));
}
