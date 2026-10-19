import { createSelector } from "reselect";
import type { FooterActivity } from "../footer/footerActivity.ts";
import { selectDictionaryImport } from "./selectDictionaryImport.ts";

const opens = {
  step: { type: "openDictionaries" },
  label: "Show on the dictionaries page",
} as const;

/** Selects the dictionary import as the footer shows it: one that runs, or one that failed and whose alert the user has not yet dismissed. */
export const selectDictionaryImportActivity = createSelector(
  [selectDictionaryImport],
  (view): FooterActivity | null => {
    if (view.addingFile !== null)
      return {
        id: "dictionary-import",
        label: `Adding ${view.addingFile}`,
        opens,
        status: "running",
        percent: view.progress?.percent ?? null,
      };
    if (view.unsupportedFile !== null || view.importFailure !== null)
      return {
        id: "dictionary-import",
        label: "A dictionary could not be added",
        opens,
        status: "failed",
      };
    return null;
  },
);
