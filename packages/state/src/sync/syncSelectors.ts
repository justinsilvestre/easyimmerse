import type { SyncLink, SyncStatus } from "@easyimmerse/types";
import type { RootState } from "../app/createAppStore.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { cacheEntry } from "../server/cacheEntry.ts";
import {
  storedCopyFetchRequestId,
  storedCopyUploadRequestId,
  uploadChoiceRequestId,
} from "./storedCopies.ts";
import {
  dismissSyncConflictsRequestId,
  runSyncRequestId,
} from "./updateSync.ts";

/** Returns the built-in server's last reported sync status, or null before it has reported one. */
export function selectSyncStatus(root: RootState): SyncStatus | null {
  return cacheEntry(root.backend, "getSyncStatus", undefined)?.data ?? null;
}

/** Returns the built-in server's link to a remote, or null when it has none or has not reported its status yet. */
export function selectSyncLink(root: RootState): SyncLink | null {
  return selectSyncStatus(root)?.link ?? null;
}

/** Tells whether the request to sync now waits for the built-in server's answer. */
export const selectIsSyncRunRequested = (root: RootState) =>
  selectIsRequestInFlight(root.app, runSyncRequestId);

/** Tells whether the conflicts are being dismissed. */
export const selectIsDismissingSyncConflicts = (root: RootState) =>
  selectIsRequestInFlight(root.app, dismissSyncConflictsRequestId);

/** Returns the media file whose copy on the server waits for the person to confirm its deletion, or null. */
export const selectStoredCopyDeletionToConfirm = (root: RootState) =>
  root.app.sync.storedCopyDeletionToConfirm;

/** Tells whether the choice to keep a copy of the media file on a server is being recorded. */
export const selectIsUploadChoiceChanging = (
  root: RootState,
  mediaFileId: string,
) => selectIsRequestInFlight(root.app, uploadChoiceRequestId(mediaFileId));

/** Tells whether the media file this browser holds is being uploaded. */
export const selectIsStoredCopyUploading = (
  root: RootState,
  mediaFileId: string,
) => selectIsRequestInFlight(root.app, storedCopyUploadRequestId(mediaFileId));

/** Tells whether the copy the remote keeps of the media file is being downloaded. */
export const selectIsStoredCopyFetching = (
  root: RootState,
  mediaFileId: string,
) => selectIsRequestInFlight(root.app, storedCopyFetchRequestId(mediaFileId));
