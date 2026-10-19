import type { Feature } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { droppedOnLeaving } from "./droppedOnLeaving.ts";
import type { MediaImports } from "./mediaImportWizard.ts";
import { updateEachImport } from "./updateEachImport.ts";

/**
 * The projects' media import dialogs, as a feature.
 * A fetch under way or failed outlasts its project's overview, so that the user can leave and come back to it,
 * and so does an action of the plugin's form still being answered, since it may start one;
 * any other dialog is dropped once the overview goes, and its requests aborted.
 */
export const mediaImportsFeature: Feature<
  MediaImports,
  "route" | "screen" | "backend"
> = {
  initialState: {},
  update: (imports, action, app) => {
    const [each, eachEffects] = updateEachImport(imports, action, app);
    const [next, dropEffects] = droppedOnLeaving(each, action, app);
    return updated(next, ...eachEffects, ...dropEffects);
  },
};
