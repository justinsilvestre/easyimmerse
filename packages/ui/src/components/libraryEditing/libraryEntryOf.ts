import {
  flashcardFieldsFromLookup,
  type LookupFieldsContext,
} from "@easyimmerse/state";
import type { LibraryEntry, LookupResult } from "@easyimmerse/types";
import { definitionMarkdown } from "../dictionaryPopup/definitionMarkdown.ts";

/** Returns the entry a dictionary result, or every result for a null index, gives a library word, with its definitions sorted into the two languages as a flashcard's are. */
export function libraryEntryOf(
  results: readonly LookupResult[],
  resultIndex: number | null,
  context: LookupFieldsContext,
): LibraryEntry | null {
  const fields = flashcardFieldsFromLookup(
    results,
    resultIndex,
    context,
    definitionMarkdown,
  );
  return (
    fields && {
      term: fields.word,
      reading: fields.word_pronunciation || null,
      l1_definition: fields.l1_definition,
      l2_definition: fields.l2_definition,
    }
  );
}
