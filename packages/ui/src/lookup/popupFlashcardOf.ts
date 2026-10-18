import {
  type ChosenWord,
  flashcardFieldsFromLookup,
  type LookupFieldsContext,
  type LookupFlashcardFields,
} from "@easyimmerse/state";
import type { LookupResult } from "@easyimmerse/types";
import { definitionMarkdown } from "./definitionMarkdown.ts";
import { type LookupPlace, placeOf } from "./lookupPlace.ts";

/**
 * The flashcard that the pop-up's flashcard buttons make from the word it shows: from every result, or from the one at `entryIndex`.
 * Its word is the dictionary's headword when a result answers, or else the term looked up.
 */
export function popupFlashcardOf(
  results: readonly LookupResult[],
  entryIndex: number | null,
  chosen: ChosenWord | null,
  context: LookupFieldsContext,
): {
  word: string;
  place: LookupPlace | null;
  fields: LookupFlashcardFields | null;
} {
  const fields = flashcardFieldsFromLookup(
    results,
    entryIndex,
    context,
    definitionMarkdown,
  );
  return {
    word: fields?.word ?? chosen?.word.term ?? "",
    place: placeOf(chosen),
    fields,
  };
}
