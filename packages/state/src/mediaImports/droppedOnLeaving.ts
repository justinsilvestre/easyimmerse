import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { mainScreenOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import { endImport } from "./mediaImportRequests.ts";
import type { MediaImports } from "./mediaImportWizard.ts";
import { outlastsTheOverview, withWizard } from "./mediaImportWizard.ts";

/**
 * Drops the dialogs that do not outlast their project's overview once it is not shown after the action, and aborts their requests.
 * This drops a dialog as its overview is left, and one whose action answered with another form while the overview was not shown.
 */
export function droppedOnLeaving(
  imports: MediaImports,
  action: AppAction,
  app: Pick<ReadableState, "route" | "screen">,
) {
  const main = mainScreenOf(routeAfter(app, action));
  const shown = main.screen === "project" ? main.projectId : null;
  let next = imports;
  const effects: Effect[] = [];
  for (const [projectId, wizard] of Object.entries(imports)) {
    if (!wizard || projectId === shown || outlastsTheOverview(wizard)) continue;
    next = withWizard(next, projectId, null);
    effects.push(...endImport(projectId, wizard));
  }
  return updated(next, ...effects);
}
