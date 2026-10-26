import type { PickedMediaFile } from "@easyimmerse/state";
import type { LibraryItem } from "@easyimmerse/types";
import type { QueryReturnValue } from "@reduxjs/toolkit/query";
import type { BackendError, BackendRequest } from "./backendClient.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { findPickedFile } from "./readPickedFile.ts";

/** The media or text file of a library item, which a browser holds, to be uploaded to the server. */
export type LibraryFileUploadArgs = { itemId: string; file: PickedMediaFile };

type BaseQuery = (
  request: BackendRequest,
) =>
  | QueryReturnValue<unknown, BackendError>
  | PromiseLike<QueryReturnValue<unknown, BackendError>>;

type Result<T> = QueryReturnValue<T, BackendError, undefined>;

/**
 * Sends the bytes of a library item's file, which a browser holds, with the file's name.
 * The file itself is the body, so the browser reads it as it sends it and states its length.
 */
export async function uploadLibraryFile(
  { itemId, file }: LibraryFileUploadArgs,
  { browserFileRegistry }: BackendThunkExtra,
  baseQuery: BaseQuery,
): Promise<Result<LibraryItem>> {
  const found = findPickedFile(file, browserFileRegistry);
  if ("error" in found) return found;
  return (await baseQuery({
    method: "PUT",
    path: `/library/items/${encodeURIComponent(itemId)}/file`,
    query: { file_name: file.name },
    body: {
      kind: "bytes",
      value: found.file,
      contentType: "application/octet-stream",
    },
  })) as Result<LibraryItem>;
}
