import type {
  DocumentFormat,
  FlashcardDraftRequest,
  ParseTimedTextRequest,
} from "@easyimmerse/types";

/** A backend operation that the WebAssembly module can perform without a server. */
export type OfflineOperation =
  | { kind: "parseTimedText"; request: ParseTimedTextRequest }
  | { kind: "parseDocument"; bytes: Uint8Array; format: DocumentFormat | null }
  | { kind: "parseDictionary"; bytes: Uint8Array }
  | { kind: "draftFlashcard"; request: FlashcardDraftRequest };
