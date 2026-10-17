import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import { updated } from "../app/updated.ts";
import type {
  AnkiExportDialog,
  StagedAnkiPackage,
} from "./ankiExportDialog.ts";
import { exportedNotice, exportFailedNotice } from "./ankiNotices.ts";
import { recordExported } from "./ankiRequests.ts";

/** The end of the user's choice of where to keep a copy of a staged package. */
type CopyEnd = Extract<
  AppAction,
  { type: "ankiExportCopyFinished" | "ankiExportCopyFailed" }
>;

/** Asks the platform to let the user keep a copy of the package the server wrote at a staging path; the dialog stays busy meanwhile. */
export function copyStaged(
  dialog: AnkiExportDialog,
  staged: StagedAnkiPackage,
  path: string,
  fileName: string,
) {
  return updated({ ...dialog, staged }, {
    type: "saveCopy",
    path,
    fileName,
  } satisfies Effect);
}

/**
 * Ends an export once the user kept a copy of its staged package: records the delivery of the flashcards the package holds, closes the dialog, and says how it went.
 * A cancelled copy leaves the dialog open, and a failed one also says why.
 */
export function copyEnded(
  dialog: AnkiExportDialog,
  action: CopyEnd,
  projectId: string,
) {
  const { staged } = dialog;
  if (staged === null) return updated(dialog);
  const reopened = { ...dialog, isBusy: false, staged: null };
  if (action.type === "ankiExportCopyFailed")
    return updated(reopened, exportFailedNotice(action));
  if (action.outcome.kind === "cancelled") return updated(reopened);
  return updated(
    null,
    recordExported(projectId, staged.flashcardIds, staged),
    exportedNotice(staged),
  );
}
