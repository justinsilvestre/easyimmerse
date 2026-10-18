import { documentFormatOf } from "@easyimmerse/state";
import type {
  Document,
  DocumentFormat,
  MediaFile,
  ParseLocalDocumentRequest,
} from "@easyimmerse/types";
import type { QueryReturnValue } from "@reduxjs/toolkit/query";
import type { BackendError, BackendRequest } from "./backendClient.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { readPickedFile } from "./readPickedFile.ts";

/** A book to parse: its file's name, which gives the format, and where the file lives. */
export type BookArgs = Pick<MediaFile, "name" | "source">;

type BookResult = QueryReturnValue<Document, BackendError, undefined>;

type BookBaseQuery = (
  request: BackendRequest,
) =>
  | QueryReturnValue<unknown, BackendError>
  | PromiseLike<QueryReturnValue<unknown, BackendError>>;

/** Parses a book from a path the server reads, or from the bytes of a file the browser holds. */
export async function parseBook(
  book: BookArgs,
  { browserFileRegistry }: BackendThunkExtra,
  baseQuery: BookBaseQuery,
): Promise<BookResult> {
  const format = documentFormatOf(book.name);
  if (book.source.kind === "path")
    return (await baseQuery(
      parseLocalRequest(book.source.path, format),
    )) as BookResult;
  const read = await readPickedFile(book, browserFileRegistry);
  if ("error" in read) return read;
  return (await baseQuery(parseBytesRequest(read.bytes, format))) as BookResult;
}

function parseLocalRequest(
  path: string,
  format: DocumentFormat | null,
): BackendRequest {
  return {
    method: "POST",
    path: "/documents/parse-local",
    body: {
      kind: "json",
      value: { path, format } satisfies ParseLocalDocumentRequest,
    },
  };
}

function parseBytesRequest(
  bytes: Uint8Array,
  format: DocumentFormat | null,
): BackendRequest {
  return {
    method: "POST",
    path: "/documents/parse",
    query: format === null ? undefined : { format },
    body: { kind: "bytes", value: bytes, contentType: contentTypeOf(format) },
    offlineOperation: { kind: "parseDocument", bytes, format },
  };
}

function contentTypeOf(format: DocumentFormat | null): string {
  if (format === "epub") return "application/epub+zip";
  if (format === "plain_text") return "text/plain";
  return "application/octet-stream";
}
