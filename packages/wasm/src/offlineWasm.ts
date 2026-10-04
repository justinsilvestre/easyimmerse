import type {
  Dictionary,
  Document,
  DocumentFormat,
  ParseTimedTextRequest,
  TimedTextTrack,
} from "@easyimmerse/types";

/** The offline subset of backend operations, backed by the WebAssembly module. */
export type OfflineWasm = {
  parseTimedText(request: ParseTimedTextRequest): TimedTextTrack;
  parseDocument(bytes: Uint8Array, format: DocumentFormat | null): Document;
  parseDictionary(fileName: string, bytes: Uint8Array): Dictionary;
};

type WasmExports = Pick<
  typeof import("../pkg/easyimmerse_wasm.js"),
  "parse_timed_text" | "parse_document" | "parse_dictionary"
>;

/** Wraps the raw JSON-string exports of an initialized module with typed functions. */
export function createOfflineWasm(module: WasmExports): OfflineWasm {
  return {
    parseTimedText: (request) =>
      JSON.parse(module.parse_timed_text(JSON.stringify(request))),
    parseDocument: (bytes, format) =>
      JSON.parse(module.parse_document(bytes, JSON.stringify(format))),
    parseDictionary: (fileName, bytes) =>
      JSON.parse(module.parse_dictionary(fileName, bytes)),
  };
}
