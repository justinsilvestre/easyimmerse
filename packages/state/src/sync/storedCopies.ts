import type { MediaFile } from "@easyimmerse/types";
import type { AppAction } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import type { Effect } from "../app/effect.ts";
import type { ReadableState } from "../app/feature.ts";
import { noticesActions } from "../notices/noticesActions.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { cacheEntry } from "../server/cacheEntry.ts";
import { hostOf } from "../server/hostOf.ts";
import { isAborted } from "../server/isAborted.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import {
  type StoredCopyRequest,
  storedCopyFailureMessage,
} from "./storedCopyFailureMessage.ts";

/** What the requests about stored copies read: the requests in flight, the server, and the cached media lists and sync status. */
export type StoredCopiesReads = Pick<
  ReadableState,
  "operations" | "server" | "backend"
>;

/** The id of the request that records whether a server keeps a copy of the media file. */
export const uploadChoiceRequestId = (mediaFileId: string) =>
  `sync/uploadChoice/${mediaFileId}`;

/** The id of the request that uploads the media file this browser holds. */
export const storedCopyUploadRequestId = (mediaFileId: string) =>
  `sync/upload/${mediaFileId}`;

/** The id of the request that downloads the copy the remote keeps of the media file. */
export const storedCopyFetchRequestId = (mediaFileId: string) =>
  `sync/fetch/${mediaFileId}`;

/**
 * Sends the person's requests about the copies a server keeps of media files, one at a time for each file,
 * and tells the person when one fails.
 */
export function storedCopyEffects(
  action: AppAction,
  reads: StoredCopiesReads,
): Effect[] {
  switch (action.type) {
    case "uploadChoiceToggled":
      return sendOnce(reads, uploadChoiceRequestId(action.mediaFileId), {
        kind: "setUploadChoice",
        projectId: action.projectId,
        mediaFileId: action.mediaFileId,
        isUploadChosen: action.isUploadChosen,
      });
    case "storedCopyUploadRequested":
      return uploadEffects(reads, action.projectId, action.mediaFileId);
    case "storedCopyFetchRequested":
      return sendOnce(reads, storedCopyFetchRequestId(action.mediaFileId), {
        kind: "fetchStoredCopy",
        projectId: action.projectId,
        mediaFileId: action.mediaFileId,
      });
    case "requestSettled":
      if (action.outcome.ok || isAborted(action.outcome)) return [];
      if (!isStoredCopyRequest(action.request)) return [];
      return [failureNotice(reads, action.request, action.outcome.error)];
    default:
      return [];
  }
}

function uploadEffects(
  reads: StoredCopiesReads,
  projectId: string,
  mediaFileId: string,
): Effect[] {
  const mediaFile = mediaFileOf(reads, projectId, mediaFileId);
  if (mediaFile?.source.kind !== "browser_file") return [];
  return sendOnce(reads, storedCopyUploadRequestId(mediaFileId), {
    kind: "uploadStoredCopy",
    projectId,
    mediaFileId,
    file: { name: mediaFile.name, source: mediaFile.source },
  });
}

function sendOnce(
  { operations }: StoredCopiesReads,
  id: string,
  request: ServerRequest,
): Effect[] {
  if (selectIsRequestInFlight({ operations }, id)) return [];
  return [{ type: "sendRequest", id, request }];
}

function failureNotice(
  reads: StoredCopiesReads,
  request: StoredCopyRequest,
  failure: Parameters<typeof storedCopyFailureMessage>[1],
) {
  const name =
    mediaFileOf(reads, request.projectId, request.mediaFileId)?.name ??
    "The media file";
  const message = storedCopyFailureMessage(
    request,
    failure,
    name,
    storageHostOf(reads),
  );
  return dispatch(
    noticesActions.noticeRequested(transientNotice("danger", message)),
  );
}

function isStoredCopyRequest(
  request: ServerRequest,
): request is StoredCopyRequest {
  return (
    request.kind === "setUploadChoice" ||
    request.kind === "uploadStoredCopy" ||
    request.kind === "fetchStoredCopy"
  );
}

function mediaFileOf(
  { backend }: StoredCopiesReads,
  projectId: string,
  mediaFileId: string,
): MediaFile | undefined {
  return cacheEntry(
    backend,
    "listMediaFiles",
    projectId,
  )?.data?.media_files.find(({ id }) => id === mediaFileId);
}

/**
 * The host of the server that keeps the copies: the remote the built-in server is linked to,
 * or else the server the app is connected to.
 */
function storageHostOf({ server, backend }: StoredCopiesReads): string {
  const link = cacheEntry(backend, "getSyncStatus", undefined)?.data?.link;
  const serverUrl = link?.server_url ?? server.config?.serverUrl ?? "";
  return hostOf(serverUrl);
}
