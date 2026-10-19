import type { Feature } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import type { Route } from "../route/route.ts";
import { settingsPageOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";
import { updateDictionaryImport } from "./updateDictionaryImport.ts";

/**
 * The adding of a dictionary from a file, as a feature.
 * A running import and its failure outlast the dictionaries page, so that the user can leave and come back to them;
 * a table whose columns are being checked is dropped once the page goes.
 */
export const dictionaryImportFeature: Feature<
  DictionaryImportWizard | null,
  "route" | "screen"
> = {
  initialState: null,
  update: (wizard, action, app) => {
    const [next, effects] = updateDictionaryImport(wizard, action);
    return isOnDictionariesPage(routeAfter(app, action)) ||
      outlastsThePage(next)
      ? updated(next, ...effects)
      : updated(null, ...effects);
  },
};

function isOnDictionariesPage(route: Route): boolean {
  return route.screen === "settings" && settingsPageOf(route) === "dictionaries";
}

function outlastsThePage(wizard: DictionaryImportWizard | null): boolean {
  return (
    wizard === null ||
    ["starting", "importing", "unsupported", "failed"].includes(wizard.stage)
  );
}
