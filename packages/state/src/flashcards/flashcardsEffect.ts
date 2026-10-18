import type { LookupResult } from "@easyimmerse/types";
import type { LookupFieldsContext } from "./flashcardForm.ts";

/**
 * Writes the fields a lookup fills on a flashcard, answered by `flashcardFieldsWritten` with the same request id.
 * Writing a definition reads its markup with the platform's parser, which an update cannot call.
 */
export type FlashcardsEffect = {
  type: "writeFlashcardFields";
  requestId: string;
  results: readonly LookupResult[];
  context: LookupFieldsContext;
};
