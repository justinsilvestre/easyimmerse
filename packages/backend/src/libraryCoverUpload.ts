import type { PickedMediaFile } from "@easyimmerse/state";
import type { LibraryItem } from "@easyimmerse/types";
import type { QueryReturnValue } from "@reduxjs/toolkit/query";
import type { BackendError, BackendRequest } from "./backendClient.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { findPickedFile } from "./readPickedFile.ts";

/** A picture that a browser holds, to be uploaded as a library item's cover. */
export type LibraryCoverUploadArgs = { itemId: string; file: PickedMediaFile };

type BaseQuery = (
  request: BackendRequest,
) =>
  | QueryReturnValue<unknown, BackendError>
  | PromiseLike<QueryReturnValue<unknown, BackendError>>;

/** Sends the bytes of a picture that a browser holds as a library item's cover. */
export async function uploadLibraryCover(
  { itemId, file }: LibraryCoverUploadArgs,
  { browserFileRegistry }: BackendThunkExtra,
  baseQuery: BaseQuery,
): Promise<QueryReturnValue<LibraryItem, BackendError, undefined>> {
  const found = findPickedFile(file, browserFileRegistry);
  if ("error" in found) return found;
  return (await baseQuery({
    method: "PUT",
    path: `/library/items/${encodeURIComponent(itemId)}/cover`,
    body: {
      kind: "bytes",
      value: found.file,
      contentType: "application/octet-stream",
    },
  })) as QueryReturnValue<LibraryItem, BackendError, undefined>;
}
