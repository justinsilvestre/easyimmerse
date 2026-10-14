import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import { updated } from "../app/updated.ts";
import type { SavePathPick } from "../platform/effects.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { isAborted } from "../server/isAborted.ts";
import { isSettled } from "../server/isSettled.ts";
import type { RequestSettled } from "../server/serverRequest.ts";
import {
  cachedFlashcards,
  cachedMediaFileIds,
  cachedProjectName,
} from "./ankiCache.ts";
import { type AnkiExportDialog, openedAnkiExport } from "./ankiExportDialog.ts";
import { flashcardIdsToExport } from "./ankiExportSelection.ts";
import { exportedNotice, exportFailedNotice } from "./ankiNotices.ts";
import { ankiRequestIds, exportPackage } from "./ankiRequests.ts";
import type { AnkiPackageExport } from "./ankiResponses.ts";

/** The project the dialog exports from, with the server cache it reads the project's flashcards and media files from. */
type ExportContext = { projectId: string; backend: ServerCacheSlice };

/**
 * Runs the dialog that exports a project's flashcards as an Anki package.
 * Export asks the platform where to save the package; the server then writes it there,
 * or, on a platform without a save dialog, hands it back for the platform to download.
 * A finished export closes the dialog and says how it went; closing the dialog stops an export under way.
 */
export function updateAnkiExport(
  dialog: AnkiExportDialog | null,
  action: AppAction,
  context: ExportContext,
) {
  switch (action.type) {
    case "ankiExportOpened":
      return updated(openedAnkiExport);
    case "ankiExportClosed":
      return updated(null, ...abortExport(dialog, context.projectId));
    default:
      return dialog === null
        ? updated(dialog)
        : updateOpenDialog(dialog, action, context);
  }
}

/** Stops the export an open dialog has under way, if any. */
export function abortExport(
  dialog: AnkiExportDialog | null,
  projectId: string,
) {
  if (dialog?.isBusy !== true) return [];
  return [
    { type: "abortRequest", id: ankiRequestIds(projectId).export },
  ] satisfies Effect[];
}

function updateOpenDialog(
  dialog: AnkiExportDialog,
  action: AppAction,
  context: ExportContext,
) {
  switch (action.type) {
    case "ankiExportScopeChosen":
      return updated({ ...dialog, scope: action.scope });
    case "ankiExportMediaToggled":
      return updated({
        ...dialog,
        mediaFileIds: toggledMedia(dialog, action.mediaFileId, context),
      });
    case "ankiExportConfirmed":
      return confirmed(dialog, context);
    case "ankiExportPathPicked":
      return pathPicked(dialog, action.pick, context);
    case "requestSettled":
      return exportSettled(dialog, action, context.projectId);
    default:
      return updated(dialog);
  }
}

/** Ticks or clears a media file; once every media file is ticked, the export includes every flashcard again. */
function toggledMedia(
  { mediaFileIds }: AnkiExportDialog,
  toggledId: string,
  { projectId, backend }: ExportContext,
): readonly string[] | null {
  const all = cachedMediaFileIds(backend, projectId);
  const chosen = mediaFileIds ?? all;
  const next = all.filter((id) => (id === toggledId) !== chosen.includes(id));
  return next.length === all.length ? null : next;
}

/** Asks where to save the package, unless an export is under way or the choices include no flashcard. */
function confirmed(dialog: AnkiExportDialog, context: ExportContext) {
  if (dialog.isBusy || idsToExport(dialog, context).length === 0)
    return updated(dialog);
  const name = cachedProjectName(context.backend, context.projectId);
  return updated(
    { ...dialog, isBusy: true },
    { type: "pickSavePath", suggestedFileName: packageFileName(name) },
  );
}

/** Sends the export to the chosen path, or for download where the platform has no save dialog; a cancelled dialog ends the export. */
function pathPicked(
  dialog: AnkiExportDialog,
  pick: SavePathPick,
  context: ExportContext,
) {
  const ids = idsToExport(dialog, context);
  if (!dialog.isBusy) return updated(dialog);
  if (pick.kind === "cancelled" || ids.length === 0)
    return updated({ ...dialog, isBusy: false });
  const savePath = pick.kind === "path" ? pick.path : null;
  return updated(dialog, exportPackage(context.projectId, ids, savePath));
}

function exportSettled(
  dialog: AnkiExportDialog,
  action: RequestSettled,
  projectId: string,
) {
  if (!isSettled(action, ankiRequestIds(projectId).export, "exportAnkiPackage"))
    return updated(dialog);
  const { outcome } = action;
  if (isAborted(outcome)) return updated({ ...dialog, isBusy: false });
  if (outcome.ok)
    return updated(
      null,
      exportedNotice(outcome.data),
      ...download(outcome.data),
    );
  return updated(
    { ...dialog, isBusy: false },
    exportFailedNotice(outcome.error),
  );
}

function download(exported: AnkiPackageExport) {
  if (exported.kind === "saved") return [];
  const { fileName, bytes } = exported;
  return [{ type: "downloadFile", fileName, bytes }] satisfies Effect[];
}

function idsToExport(dialog: AnkiExportDialog, context: ExportContext) {
  const flashcards = cachedFlashcards(context.backend, context.projectId);
  return flashcardIdsToExport(flashcards, dialog);
}

/** Names the package after the project, without the characters file systems forbid. */
function packageFileName(projectName: string | null): string {
  const name = projectName?.replace(/[/\\:*?"<>|]/g, "_").trim();
  return `${name || "flashcards"}.apkg`;
}
