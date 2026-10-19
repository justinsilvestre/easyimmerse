import { createSelector } from "reselect";
import type { AppRoot } from "../app/createAppStore.ts";
import { isOnDictionariesPage } from "../route/route.ts";
import { selectDictionaryImport } from "./selectDictionaryImport.ts";

/** What the status line shows of a dictionary import while the dictionaries page is not on top. */
export type DictionaryImportStatus =
  | {
      kind: "running";
      fileName: string;
      /** How much of the file has been read, from 0 to 100, when its format can tell. */
      percent: number | null;
    }
  | { kind: "failed" };

/**
 * Selects the dictionary import to show in the status line: one that runs, or one that failed and whose alert the user has not yet seen.
 * Null while the dictionaries page is on top, since the page shows the import itself.
 */
export const selectDictionaryImportStatus = createSelector(
  [selectDictionaryImport, (state: AppRoot) => state.app.route],
  (view, route): DictionaryImportStatus | null => {
    if (isOnDictionariesPage(route)) return null;
    if (view.addingFile !== null)
      return {
        kind: "running",
        fileName: view.addingFile,
        percent: view.progress?.percent ?? null,
      };
    if (view.unsupportedFile !== null || view.importFailure !== null)
      return { kind: "failed" };
    return null;
  },
);
