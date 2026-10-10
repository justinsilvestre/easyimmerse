import type { PickedDictionaryFile } from "@easyimmerse/state";
import type {
  ImportJobStarted,
  ImportLocalDictionaryRequest,
  TableLayout,
  TablePreview,
} from "@easyimmerse/types";
import type { QueryReturnValue } from "@reduxjs/toolkit/query";
import type { BackendError, BackendRequest } from "./backendClient.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { readPickedFile } from "./readPickedFile.ts";

/** A picked dictionary file to import, with the columns the user chose when it is a table. */
export type ImportPickedDictionaryArgs = {
  file: PickedDictionaryFile;
  /** Replaces the detected layout of a CSV, TSV or Tabfile table. */
  tableLayout?: TableLayout | null;
};

type BaseQuery = (
  request: BackendRequest,
) =>
  | QueryReturnValue<unknown, BackendError>
  | PromiseLike<QueryReturnValue<unknown, BackendError>>;

type Result<T> = QueryReturnValue<T, BackendError, undefined>;

/** Imports a picked dictionary: the server reads a file with a path, and a browser's file is sent as bytes. */
export async function importPickedDictionary(
  { file, tableLayout = null }: ImportPickedDictionaryArgs,
  { browserFileRegistry }: BackendThunkExtra,
  baseQuery: BaseQuery,
): Promise<Result<ImportJobStarted>> {
  if (file.source.kind === "path")
    return (await baseQuery(
      importLocalRequest(file.source.path, tableLayout),
    )) as Result<ImportJobStarted>;
  const read = await readPickedFile(file, browserFileRegistry);
  if ("error" in read) return read;
  return (await baseQuery(
    importBytesRequest(file.name, read.bytes, tableLayout),
  )) as Result<ImportJobStarted>;
}

/** Reads the first rows of a picked table and the columns detected in it, so that the user can check them. */
export async function previewPickedDictionaryTable(
  { file }: { file: PickedDictionaryFile },
  { browserFileRegistry }: BackendThunkExtra,
  baseQuery: BaseQuery,
): Promise<Result<TablePreview>> {
  if (file.source.kind === "path")
    return (await baseQuery(
      jsonPost("/dictionaries/preview-local", { path: file.source.path }),
    )) as Result<TablePreview>;
  const read = await readPickedFile(file, browserFileRegistry);
  if ("error" in read) return read;
  return (await baseQuery({
    ...bytesPost("/dictionaries/preview", read.bytes, { fileName: file.name }),
    offlineOperation: {
      kind: "previewDictionaryTable",
      fileName: file.name,
      bytes: read.bytes,
    },
  })) as Result<TablePreview>;
}

function importLocalRequest(
  path: string,
  tableLayout: TableLayout | null,
): BackendRequest {
  const value: ImportLocalDictionaryRequest =
    tableLayout === null ? { path } : { path, tableLayout };
  return jsonPost("/dictionaries/import-local", value);
}

function importBytesRequest(
  fileName: string,
  bytes: Uint8Array,
  tableLayout: TableLayout | null,
): BackendRequest {
  const query = { fileName, ...tableLayoutQuery(tableLayout) };
  return {
    ...bytesPost("/dictionaries", bytes, query),
    offlineOperation: {
      kind: "importDictionary",
      fileName,
      bytes,
      tableLayout,
    },
  };
}

function jsonPost(path: string, value: unknown): BackendRequest {
  return { method: "POST", path, body: { kind: "json", value } };
}

function bytesPost(
  path: string,
  bytes: Uint8Array,
  query: Record<string, string>,
): BackendRequest {
  return {
    method: "POST",
    path,
    query,
    body: {
      kind: "bytes",
      value: bytes,
      contentType: "application/octet-stream",
    },
  };
}

/** The query parameters that replace the detected layout of a table. */
function tableLayoutQuery(layout: TableLayout | null): Record<string, string> {
  if (layout === null) return {};
  return {
    columns: layout.columns.join(","),
    hasHeader: String(layout.hasHeader),
  };
}
