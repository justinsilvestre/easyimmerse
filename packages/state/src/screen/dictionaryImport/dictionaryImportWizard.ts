import type { TableLayout, TablePreview } from "@easyimmerse/types";
import type { PickedDictionaryFile } from "../../platform/effects.ts";

/** Where adding a dictionary from a picked file stands. Absent while nothing is being added or reported. */
export type DictionaryImportWizard =
  /** A table's first rows are being read, so that the user can check its columns. */
  | { stage: "previewing"; file: PickedDictionaryFile }
  /** A table's first rows are shown, for the user to check what each column holds. */
  | {
      stage: "choosingColumns";
      file: PickedDictionaryFile;
      preview: TablePreview;
      /** The columns as the user has set them so far, starting from those the app detected. */
      layout: TableLayout;
    }
  /** The import request is sent, and the server has not yet named its job. */
  | { stage: "starting"; file: PickedDictionaryFile }
  | { stage: "importing"; file: PickedDictionaryFile; jobId: string }
  /** The file is in a format no reader supports, until the user dismisses the alert. */
  | { stage: "unsupported"; fileName: string }
  /** Why the file could not be added, until the user dismisses the alert. */
  | { stage: "failed"; message: string };
