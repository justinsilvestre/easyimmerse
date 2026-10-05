import type {
  DocumentFormat,
  ParseTimedTextRequest,
  TableLayout,
} from "@easyimmerse/types";

/** A backend operation that the WebAssembly module can perform without a server. */
export type OfflineOperation =
  | { kind: "parseTimedText"; request: ParseTimedTextRequest }
  | { kind: "parseDocument"; bytes: Uint8Array; format: DocumentFormat | null }
  | {
      kind: "parseDictionary";
      fileName: string;
      bytes: Uint8Array;
      tableLayout: TableLayout | null;
    }
  | { kind: "previewDictionaryTable"; fileName: string; bytes: Uint8Array };
