import type { Effect } from "../../app/effect.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import { jobKey } from "../../operations/jobs.ts";
import { isSettled } from "../../server/isSettled.ts";
import type {
  RequestOutcome,
  RequestSettled,
} from "../../server/serverRequest.ts";
import {
  dictionaryImportIds,
  stopWatching,
  watchImportJob,
} from "./dictionaryImportRequests.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";
import { failedImport } from "./failedImport.ts";

type Result = readonly [DictionaryImportWizard | null, readonly Effect[]];
type Importing = Extract<DictionaryImportWizard, { stage: "importing" }>;

/** Applies the answer to a preview or import request, or a status of the import's job; answers to other requests change nothing. */
export function dictionaryImportAnswered(
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
        {
          type: "showNotice",
          content: transientNotice("success", `Added ${dictionary.title}`),
        },
      ],
    ];
  if (state === "failed" && error !== null)
    return [failedImport(wizard.file.name, error), stop];
  return [wizard, []];
}
