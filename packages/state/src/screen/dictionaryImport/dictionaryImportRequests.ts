import type { TableLayout } from "@easyimmerse/types";
import type { Effect } from "../../app/effect.ts";
import { jobKey } from "../../operations/jobs.ts";
import type { PickedDictionaryFile } from "../../platform/effects.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";

/** The ids of the requests that adding a dictionary sends. */
export const dictionaryImportIds = {
  preview: "settings/dictionaryImport/preview",
  import: "settings/dictionaryImport/import",
};

/** Asks for a picked table's first rows and detected columns. */
export function previewRequest(file: PickedDictionaryFile): Effect {
  return {
    type: "sendRequest",
    id: dictionaryImportIds.preview,
    request: { kind: "previewDictionaryTable", file },
  };
}

/** Sends a picked file to be imported, with the columns chosen for a table. */
export function importRequest(
  file: PickedDictionaryFile,
  tableLayout: TableLayout | null,
): Effect {
  return {
    type: "sendRequest",
    id: dictionaryImportIds.import,
    request: { kind: "importDictionary", file, tableLayout },
  };
}

/** Starts polling the import's job. */
export function watchImportJob(jobId: string): Effect {
  const request = { kind: "getImportJob", jobId } as const;
  return { type: "watchJob", job: { kind: "dictionaryImport", request } };
}

/** Stops polling the wizard's job, if it is watching one. */
export function stopWatching(wizard: DictionaryImportWizard | null): Effect[] {
  return wizard?.stage === "importing"
    ? [{ type: "unwatchJob", key: jobKey("dictionaryImport", wizard.jobId) }]
    : [];
}
