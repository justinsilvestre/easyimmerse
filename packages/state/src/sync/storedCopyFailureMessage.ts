import type { RequestFailure, ServerRequest } from "../server/serverRequest.ts";

/** A request about the copy a server keeps of a media file. */
export type StoredCopyRequest = Extract<
  ServerRequest,
  { kind: "setUploadChoice" | "uploadStoredCopy" | "fetchStoredCopy" }
>;

/** Tells the person why a request about the copy of the media file named `name` on the server at `host` failed. */
export function storedCopyFailureMessage(
  request: StoredCopyRequest,
  failure: RequestFailure,
  name: string,
  host: string,
): string {
  if (failure.code === "uploads_unavailable")
    return `${host} doesn't keep copies of media files.`;
  if (failure.code === "remote_unreachable")
    return `${host} couldn't be reached. Check your connection and try again.`;
  switch (request.kind) {
    case "uploadStoredCopy":
      return uploadFailureMessage(failure, name, host);
    case "fetchStoredCopy":
      return `${name} couldn't be downloaded from ${host}.`;
    case "setUploadChoice":
      return request.isUploadChosen
        ? `${host} couldn't be asked to keep a copy of ${name}.`
        : `${name} couldn't be deleted from ${host}.`;
  }
}

function uploadFailureMessage(
  failure: RequestFailure,
  name: string,
  host: string,
): string {
  if (failure.code === "quota_exceeded")
    return `There isn't enough room on ${host} for this file.`;
  if (failure.code === "browserFileGone")
    return `This browser no longer holds ${name}. Add the file again to upload it.`;
  return `${name} couldn't be uploaded to ${host}.`;
}
