import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";

const ownMessageCodes = ["browserFileGone", "browserFileUnreachable"];

/** Returns the stage a failure to add a file leaves: the format refused, or a sentence naming the file and the reason. */
export function failedImport(
  fileName: string,
  failure: { code?: string | null; message: string },
): DictionaryImportWizard {
  if (failure.code === "unsupported_dictionary_format")
    return { stage: "unsupported", fileName };
  if (ownMessageCodes.includes(failure.code ?? ""))
    return {
      stage: "failed",
      message: `${fileName} is no longer available. Pick it again.`,
    };
  return {
    stage: "failed",
    message: `${fileName} could not be added: ${failure.message}`,
  };
}
