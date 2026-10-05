import type {
  Dictionary,
  Document,
  DocumentFormat,
  ParseTimedTextRequest,
  TableLayout,
  TablePreview,
  TimedTextTrack,
} from "@easyimmerse/types";

/** The offline subset of backend operations, backed by the WebAssembly module. */
export type OfflineWasm = {
  parseTimedText(request: ParseTimedTextRequest): TimedTextTrack;
  parseDocument(bytes: Uint8Array, format: DocumentFormat | null): Document;
  /** Reads a dictionary file. A table layout replaces the detected layout of a CSV, TSV or Tabfile table. */
  parseDictionary(
    fileName: string,
    bytes: Uint8Array,
    tableLayout?: TableLayout | null,
  ): Dictionary;
  previewDictionaryTable(fileName: string, bytes: Uint8Array): TablePreview;
};

type WasmExports = Pick<
  typeof import("../pkg/easyimmerse_wasm.js"),
  | "parse_timed_text"
  | "parse_document"
  | "parse_dictionary"
  | "preview_dictionary_table"
>;

/** Wraps the raw JSON-string exports of an initialized module with typed functions. */
export function createOfflineWasm(module: WasmExports): OfflineWasm {
  return {
    parseTimedText: (request) =>
      JSON.parse(module.parse_timed_text(JSON.stringify(request))),
    parseDocument: (bytes, format) =>
      JSON.parse(module.parse_document(bytes, JSON.stringify(format))),
    parseDictionary: (fileName, bytes, tableLayout = null) =>
      JSON.parse(
        module.parse_dictionary(fileName, bytes, JSON.stringify(tableLayout)),
      ),
    previewDictionaryTable: (fileName, bytes) =>
      JSON.parse(module.preview_dictionary_table(fileName, bytes)),
  };
}
