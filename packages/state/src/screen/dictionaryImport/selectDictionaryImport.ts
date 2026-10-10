import type {
  ImportProgress,
  TableLayout,
  TablePreview,
} from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { AppRoot } from "../../app/createAppStore.ts";
import type { JobsState } from "../../operations/jobs.ts";
import { jobKey } from "../../operations/jobs.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";
import { termHint } from "./tableLayout.ts";

/** What the dictionaries page shows of adding a dictionary from a file. */
export type DictionaryImportView = {
  /** The file being read or imported. */
  addingFile: string | null;
  /** What the import has stored so far, once its job reports it. */
  progress: ImportProgress | null;
  /** The file refused because no supported format reads it, until dismissed. */
  unsupportedFile: string | null;
  /** Why the last file could not be added for another reason, until dismissed. */
  importFailure: string | null;
  /** The table whose columns the user is checking, with the columns as set so far and why they cannot be imported yet, if so. */
  pendingTable: {
    fileName: string;
    preview: TablePreview;
    layout: TableLayout;
    hint: string | null;
  } | null;
};

const nothingShown: DictionaryImportView = {
  addingFile: null,
  progress: null,
  unsupportedFile: null,
  importFailure: null,
  pendingTable: null,
};

/**
 * Selects what the dictionaries page shows of the dictionary import, with its job's progress.
 * The result keeps its reference while the wizard and the jobs do.
 */
export const selectDictionaryImport = createSelector(
  [
    (state: AppRoot) => state.app.screen.settings?.dictionaryImport ?? null,
    (state: AppRoot) => state.app.operations.jobs,
  ],
  (wizard, jobs): DictionaryImportView =>
    wizard === null
      ? nothingShown
      : { ...nothingShown, ...viewOf(wizard, jobs) },
);

function viewOf(
  wizard: DictionaryImportWizard,
  jobs: JobsState,
): Partial<DictionaryImportView> {
  switch (wizard.stage) {
    case "previewing":
    case "starting":
      return { addingFile: wizard.file.name };
    case "importing":
      return {
        addingFile: wizard.file.name,
        progress: progressOf(wizard.jobId, jobs),
      };
    case "choosingColumns":
      return {
        pendingTable: {
          fileName: wizard.file.name,
          preview: wizard.preview,
          layout: wizard.layout,
          hint: termHint(wizard.layout),
        },
      };
    case "unsupported":
      return { unsupportedFile: wizard.fileName };
    case "failed":
      return { importFailure: wizard.message };
  }
}

function progressOf(jobId: string, jobs: JobsState): ImportProgress | null {
  const job = jobs[jobKey("dictionaryImport", jobId)];
  return job?.kind === "dictionaryImport"
    ? (job.report?.progress ?? null)
    : null;
}
