import type { PickedMediaFile } from "@easyimmerse/state";
import type { StoredCopy } from "@easyimmerse/types";
import type { QueryReturnValue } from "@reduxjs/toolkit/query";
import type { BackendError, BackendRequest } from "./backendClient.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { findPickedFile } from "./readPickedFile.ts";

/** A media file whose bytes a browser holds, to be kept on the server. */
export type StoredCopyUploadArgs = {
  projectId: string;
  mediaFileId: string;
  file: PickedMediaFile;
};

type BaseQuery = (
  request: BackendRequest,
) =>
  | QueryReturnValue<unknown, BackendError>
  | PromiseLike<QueryReturnValue<unknown, BackendError>>;

type Result<T> = QueryReturnValue<T, BackendError, undefined>;

/**
 * Sends the bytes of a file a browser holds for the server to keep a copy of.
 * The file itself is the body, so the browser reads it as it sends it and states its length.
 */
export async function uploadStoredCopy(
  { projectId, mediaFileId, file }: StoredCopyUploadArgs,
  { browserFileRegistry }: BackendThunkExtra,
  baseQuery: BaseQuery,
): Promise<Result<StoredCopy>> {
  const found = findPickedFile(file, browserFileRegistry);
  if ("error" in found) return found;
  return (await baseQuery({
    method: "PUT",
    path: `/projects/${projectId}/media/${mediaFileId}/stored-copy`,
    body: {
      kind: "bytes",
      value: found.file,
      contentType: "application/octet-stream",
    },
  })) as Result<StoredCopy>;
}
