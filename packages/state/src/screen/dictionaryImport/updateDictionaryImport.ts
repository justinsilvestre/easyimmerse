import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { isAborted } from "../../server/isAborted.ts";
import { dictionaryImportAnswered } from "./dictionaryImportAnswered.ts";
import {
  importRequest,
  previewRequest,
  stopWatching,
} from "./dictionaryImportRequests.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";
import { isTableFile } from "./isTableFile.ts";

type Wizard = DictionaryImportWizard | null;
type Result = readonly [Wizard, readonly Effect[]];

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
      return wizard === null || isAborted(action.outcome)
        ? [wizard, []]
        : dictionaryImportAnswered(wizard, action);
    default:
      return [wizard, []];
  }
}
