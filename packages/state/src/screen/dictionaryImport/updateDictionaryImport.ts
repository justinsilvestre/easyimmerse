import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { jobKey } from "../../operations/jobs.ts";
import { isSettled } from "../../server/isSettled.ts";
import type {
  RequestOutcome,
  RequestSettled,
} from "../../server/serverRequest.ts";
import {
  dictionaryImportIds,
  importRequest,
  previewRequest,
  stopWatching,
  watchImportJob,
} from "./dictionaryImportRequests.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";
import { failedImport } from "./failedImport.ts";
import { isTableFile } from "./isTableFile.ts";

type Wizard = DictionaryImportWizard | null;
type Result = readonly [Wizard, readonly Effect[]];
type Importing = Extract<DictionaryImportWizard, { stage: "importing" }>;

/**
 * Adds a dictionary from a picked file: previews a table so that the user can check its columns,
 * sends the file to be imported, watches the import's job, and keeps a failure until it is dismissed.
 */
export function updateDictionaryImport(
  wizard: Wizard,
  action: AppAction,
): Result {
  switch (action.type) {
    case "dictionaryFileChosen": {
      const { file } = action;
      return isTableFile(file.name)
        ? [
            { stage: "previewing", file },
            [...stopWatching(wizard), previewRequest(file)],
          ]
        : [
            { stage: "starting", file },
            [...stopWatching(wizard), importRequest(file, null)],
          ];
    }
    case "dictionaryColumnsChosen":
      return wizard?.stage === "choosingColumns"
        ? [
            { stage: "starting", file: wizard.file },
            [importRequest(wizard.file, action.layout)],
          ]
        : [wizard, []];
    case "dictionaryColumnsCancelled":
      return wizard?.stage === "choosingColumns" ? [null, []] : [wizard, []];
    case "dictionaryImportAlertDismissed":
      return wizard?.stage === "unsupported" || wizard?.stage === "failed"
        ? [null, []]
        : [wizard, []];
    case "requestSettled":
      return wizard === null || isAborted(action)
        ? [wizard, []]
        : settled(wizard, action);
    default:
      return [wizard, []];
  }
}

function settled(
  wizard: DictionaryImportWizard,
  action: RequestSettled,
): Result {
  if (
    wizard.stage === "previewing" &&
    isSettled(action, dictionaryImportIds.preview, "previewDictionaryTable")
  )
    return action.outcome.ok
      ? [
          {
            stage: "choosingColumns",
            file: wizard.file,
            preview: action.outcome.data,
          },
          [],
        ]
      : [failedImport(wizard.file.name, action.outcome.error), []];
  if (
    wizard.stage === "starting" &&
    isSettled(action, dictionaryImportIds.import, "importDictionary")
  )
    return action.outcome.ok
      ? [
          {
            stage: "importing",
            file: wizard.file,
            jobId: action.outcome.data.id,
          },
          [watchImportJob(action.outcome.data.id)],
        ]
      : [failedImport(wizard.file.name, action.outcome.error), []];
  if (
    wizard.stage === "importing" &&
    isSettled(action, jobKey("dictionaryImport", wizard.jobId), "getImportJob")
  )
    return importJobChecked(wizard, action.outcome);
  return [wizard, []];
}

/** Ends the wizard once its job is done or has failed, and stops watching the job; a running job changes nothing. */
function importJobChecked(
  wizard: Importing,
  outcome: RequestOutcome<"getImportJob">,
): Result {
  const stop = stopWatching(wizard);
  if (!outcome.ok) return [failedImport(wizard.file.name, outcome.error), stop];
  const { state, dictionary, error } = outcome.data;
  if (state === "done" && dictionary !== null)
    return [
      null,
      [
        ...stop,
        { type: "showNotification", message: `Added ${dictionary.title}` },
      ],
    ];
  if (state === "failed" && error !== null)
    return [failedImport(wizard.file.name, error), stop];
  return [wizard, []];
}

function isAborted(action: RequestSettled): boolean {
  return !action.outcome.ok && action.outcome.error.status === "ABORTED";
}
