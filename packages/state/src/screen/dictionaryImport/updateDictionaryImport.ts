import type { AppAction } from "../../app/appAction.ts";
import { updated } from "../../app/updated.ts";
import { isAborted } from "../../server/isAborted.ts";
import { dictionaryImportAnswered } from "./dictionaryImportAnswered.ts";
import {
  importRequest,
  previewRequest,
  stopWatching,
} from "./dictionaryImportRequests.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";
import { isTableFile } from "./isTableFile.ts";
import {
  termHint,
  withColumnRole,
  withHeaderRowToggled,
} from "./tableLayout.ts";

/**
 * Adds a dictionary from a picked file: previews a table so that the user can check its columns,
 * imports it once exactly one column holds the term,
 * sends the file to be imported, watches the import's job, and keeps a failure until it is dismissed.
 */
export function updateDictionaryImport(
  wizard: DictionaryImportWizard | null,
  action: AppAction,
) {
  switch (action.type) {
    case "dictionaryFileChosen": {
      const { file } = action;
      return isTableFile(file.name)
        ? updated(
            { stage: "previewing", file } satisfies DictionaryImportWizard,
            ...stopWatching(wizard),
            previewRequest(file),
          )
        : updated(
            { stage: "starting", file } satisfies DictionaryImportWizard,
            ...stopWatching(wizard),
            importRequest(file, null),
          );
    }
    case "dictionaryColumnRoleChosen":
      return wizard?.stage === "choosingColumns"
        ? updated({
            ...wizard,
            layout: withColumnRole(wizard.layout, action.index, action.role),
          })
        : updated(wizard);
    case "dictionaryHeaderRowToggled":
      return wizard?.stage === "choosingColumns"
        ? updated({ ...wizard, layout: withHeaderRowToggled(wizard.layout) })
        : updated(wizard);
    case "dictionaryColumnsConfirmed":
      return wizard?.stage === "choosingColumns" &&
        termHint(wizard.layout) === null
        ? updated(
            {
              stage: "starting",
              file: wizard.file,
            } satisfies DictionaryImportWizard,
            importRequest(wizard.file, wizard.layout),
          )
        : updated(wizard);
    case "dictionaryColumnsCancelled":
      return wizard?.stage === "choosingColumns"
        ? updated(null)
        : updated(wizard);
    case "dictionaryImportAlertDismissed":
      return wizard?.stage === "unsupported" || wizard?.stage === "failed"
        ? updated(null)
        : updated(wizard);
    case "requestSettled":
      return wizard === null || isAborted(action.outcome)
        ? updated(wizard)
        : dictionaryImportAnswered(wizard, action);
    default:
      return updated(wizard);
  }
}
