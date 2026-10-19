import type { Effect } from "../app/effect.ts";
import type { Feature } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { isOnDictionariesPage } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import { dictionaryImportIds } from "./dictionaryImportRequests.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";
import { updateDictionaryImport } from "./updateDictionaryImport.ts";

/**
 * The adding of a dictionary from a file, as a feature.
 * A running import and its failure outlast the dictionaries page, so that the user can leave and come back to them;
 * a table being previewed or whose columns are being checked is dropped once the page goes, and its preview request aborted.
 */
export const dictionaryImportFeature: Feature<
  DictionaryImportWizard | null,
  "route" | "screen" | "mediaImports"
> = {
  initialState: null,
  update: (wizard, action, app) => {
    const [next, effects] = updateDictionaryImport(wizard, action);
    if (
      next === null ||
      outlastsThePage(next) ||
      isOnDictionariesPage(routeAfter(app, action))
    )
      return updated(next, ...effects);
    return updated(null, ...effects, ...abortPreview(next));
  },
};

function outlastsThePage(wizard: DictionaryImportWizard): boolean {
  return ["starting", "importing", "unsupported", "failed"].includes(
    wizard.stage,
  );
}

function abortPreview(wizard: DictionaryImportWizard) {
  return wizard.stage === "previewing"
    ? ([
        { type: "abortRequest", id: dictionaryImportIds.preview },
      ] satisfies Effect[])
    : [];
}
