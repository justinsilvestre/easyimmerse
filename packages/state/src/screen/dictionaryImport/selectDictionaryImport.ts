import type { ImportProgress, TablePreview } from "@easyimmerse/types";
import type { RootState } from "../../app/createAppStore.ts";
import { jobKey } from "../../operations/jobs.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";

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
  /** The table whose columns the user is checking. */
  pendingTable: { fileName: string; preview: TablePreview } | null;
};

const nothingShown: DictionaryImportView = {
  addingFile: null,
  progress: null,
  unsupportedFile: null,
  importFailure: null,
  pendingTable: null,
};

/** Selects what the dictionaries page shows of the dictionary import, with its job's progress. */
export function selectDictionaryImport(state: RootState): DictionaryImportView {
  const wizard = state.app.screen.settings?.dictionaryImport ?? null;
  return wizard === null
    ? nothingShown
    : { ...nothingShown, ...viewOf(wizard, state) };
}

function viewOf(
  wizard: DictionaryImportWizard,
  state: RootState,
): Partial<DictionaryImportView> {
  switch (wizard.stage) {
    case "previewing":
    case "starting":
      return { addingFile: wizard.file.name };
    case "importing":
      return {
        addingFile: wizard.file.name,
        progress: progressOf(wizard.jobId, state),
      };
    case "choosingColumns":
      return {
        pendingTable: { fileName: wizard.file.name, preview: wizard.preview },
      };
    case "unsupported":
      return { unsupportedFile: wizard.fileName };
    case "failed":
      return { importFailure: wizard.message };
  }
}

function progressOf(jobId: string, state: RootState): ImportProgress | null {
  const job = state.app.operations.jobs[jobKey("dictionaryImport", jobId)];
  return job?.kind === "dictionaryImport"
    ? (job.report?.progress ?? null)
    : null;
}
