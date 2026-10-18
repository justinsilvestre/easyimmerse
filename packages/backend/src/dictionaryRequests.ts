import type {
  ImportLocalDictionaryRequest,
  TableLayout,
} from "@easyimmerse/types";
import type { BackendRequest } from "./backendClient.ts";

/** Has the server read a table's first rows from its path. */
export function previewLocalRequest(path: string): BackendRequest {
  return jsonPost("/dictionaries/preview-local", { path });
}

/** Sends a table's bytes to have its first rows read. */
export function previewBytesRequest(
  fileName: string,
  bytes: Uint8Array,
): BackendRequest {
  return {
    ...bytesPost("/dictionaries/preview", bytes, { fileName }),
    offlineOperation: { kind: "previewDictionaryTable", fileName, bytes },
  };
}

/** Has the server import a dictionary file from its path, with the columns chosen for a table. */
export function importLocalRequest(
  path: string,
  tableLayout: TableLayout | null,
): BackendRequest {
  const value: ImportLocalDictionaryRequest =
    tableLayout === null ? { path } : { path, tableLayout };
  return jsonPost("/dictionaries/import-local", value);
}

/** Sends a dictionary file's bytes to be imported, with the columns chosen for a table. */
export function importBytesRequest(
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
