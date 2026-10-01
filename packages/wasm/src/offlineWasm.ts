import type {
  Dictionary,
  Document,
  DocumentFormat,
  FlashcardDraftRequest,
  NewFlashcard,
  ParseTimedTextRequest,
  TermEntry,
  TimedTextTrack,
} from "@easyimmerse/types";

/** The offline subset of backend operations, backed by the WebAssembly module. */
export type OfflineWasm = {
  parseTimedText(request: ParseTimedTextRequest): TimedTextTrack;
  parseDocument(bytes: Uint8Array, format: DocumentFormat | null): Document;
  parseDictionary(bytes: Uint8Array): Dictionary;
  draftFlashcard(request: FlashcardDraftRequest): NewFlashcard;
  lookupTerm(dictionary: Dictionary, term: string): TermEntry[];
};

type WasmExports = Pick<
  typeof import("../pkg/easyimmerse_wasm.js"),
  | "parse_timed_text"
  | "parse_document"
  | "parse_dictionary"
  | "draft_flashcard"
  | "lookup_term"
>;

/** Wraps the raw JSON-string exports of an initialized module with typed functions. */
export function createOfflineWasm(module: WasmExports): OfflineWasm {
  return {
    parseTimedText: (request) =>
      JSON.parse(module.parse_timed_text(JSON.stringify(request))),
    parseDocument: (bytes, format) =>
      JSON.parse(module.parse_document(bytes, JSON.stringify(format))),
    parseDictionary: (bytes) => JSON.parse(module.parse_dictionary(bytes)),
    draftFlashcard: (request) =>
      JSON.parse(module.draft_flashcard(JSON.stringify(request))),
    lookupTerm: (dictionary, term) =>
      JSON.parse(module.lookup_term(JSON.stringify(dictionary), term)),
  };
}
