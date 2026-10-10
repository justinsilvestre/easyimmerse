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

/** A book to parse: its file's name, which gives the format, and where the file lives. */
export type BookArgs = Pick<MediaFile, "name" | "source">;

type BookResult = QueryReturnValue<Document, BackendError, undefined>;

type BookBaseQuery = (
  request: BackendRequest,
) =>
  | QueryReturnValue<unknown, BackendError>
  | PromiseLike<QueryReturnValue<unknown, BackendError>>;

/** The failure for a file a browser added, on a platform that holds no browser files. */
const browserFileUnreachable: BackendError = {
  status: 404,
  code: "browserFileUnreachable",
  message: "This app holds no files added in a web browser.",
};

/** The failure for a file a browser added and no longer holds. */
const browserFileGone: BackendError = {
  status: 404,
  code: "browserFileGone",
  message: "The browser no longer holds this file.",
};

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
  if (browserFileRegistry === null) return { error: browserFileUnreachable };
  const file = browserFileRegistry.find(book.name, book.source);
  if (file === null) return { error: browserFileGone };
  const bytes = new Uint8Array(await file.arrayBuffer());
  return (await baseQuery(parseBytesRequest(bytes, format))) as BookResult;
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
