import { createSelector } from "reselect";
import type { AppRoot } from "../app/createAppStore.ts";
import type { FooterActivity } from "../footer/footerActivity.ts";
import { jobKey } from "../operations/jobs.ts";

const opens = {
  step: { type: "openDictionaries" },
  label: "Show on the dictionaries page",
} as const;

/**
 * Selects the dictionary import as the footer shows it: one that runs, or one that failed and whose alert the user has not yet dismissed.
 * The result keeps its reference while the import and its own job do, whatever other jobs report.
 */
export const selectDictionaryImportActivity = createSelector(
  [
    (state: AppRoot) => state.app.dictionaryImport,
    (state: AppRoot) => {
      const wizard = state.app.dictionaryImport;
      return wizard?.stage === "importing"
        ? (state.app.operations.jobs[
            jobKey("dictionaryImport", wizard.jobId)
          ] ?? null)
        : null;
    },
  ],
  (wizard, job): FooterActivity | null => {
    switch (wizard?.stage) {
      case "previewing":
      case "starting":
      case "importing":
        return {
          id: "dictionary-import",
          label: `Adding ${wizard.file.name}`,
          opens,
          status: "running",
          percent:
            job?.kind === "dictionaryImport"
              ? (job.report?.progress?.percent ?? null)
              : null,
        };
      case "unsupported":
      case "failed":
        return {
          id: "dictionary-import",
          label: "A dictionary could not be added",
          opens,
          status: "failed",
        };
      default:
        return null;
    }
  },
);
